import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { badge, btn, card } from "@/components/ui";
import { ExamRunner, type RunnerQuestion } from "./exam-runner";

export const metadata: Metadata = { title: "ทำข้อสอบ" };

export default async function AttemptPage({ params, searchParams }: PageProps<"/exam/[slug]/attempt/[attemptId]">) {
  const { slug, attemptId } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/exam/${slug}/attempt/${attemptId}`);

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, user_id, started_at, submitted_at, score, passed, exams(id, slug, title, time_limit_minutes, passing_score)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || !attempt.exams || attempt.exams.slug !== slug) notFound();
  const exam = attempt.exams;
  const isOwner = attempt.user_id === user.id;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, stem, explanation, points, position")
    .eq("exam_id", exam.id)
    .order("position");
  const qIds = new Set((questions ?? []).map((q) => q.id));

  const [{ data: choices }, { data: answers }] = await Promise.all([
    supabase
      .from("exam_choices")
      .select("id, question_id, body, position")
      .in("question_id", [...qIds])
      .order("position"),
    supabase.from("attempt_answers").select("question_id, choice_id").eq("attempt_id", attempt.id),
  ]);
  const choicesByQ = new Map<string, { id: string; body: string }[]>();
  for (const c of choices ?? []) {
    if (!c.id || !c.question_id || !qIds.has(c.question_id)) continue;
    const arr = choicesByQ.get(c.question_id) ?? [];
    arr.push({ id: c.id, body: c.body ?? "" });
    choicesByQ.set(c.question_id, arr);
  }
  const answerMap: Record<string, string> = {};
  for (const a of answers ?? []) if (a.choice_id) answerMap[a.question_id] = a.choice_id;

  const runnerQuestions: RunnerQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    stem: q.stem,
    points: Number(q.points),
    choices: choicesByQ.get(q.id) ?? [],
  }));

  // ---- Result view ----
  if (attempt.submitted_at) {
    return (
      <main className="space-y-6">
        <div>
          <Link href={`/exam/${exam.slug}`} className="text-sm text-zinc-500 hover:underline">← {exam.title}</Link>
          <h1 className="mt-2 text-2xl font-semibold">ผลการสอบ</h1>
        </div>

        <section className={`${card} flex flex-wrap items-center gap-6`}>
          <div>
            <p className="text-sm text-zinc-500">คะแนน</p>
            <p className="text-4xl font-semibold">{formatScore(attempt.score)}</p>
          </div>
          {attempt.passed != null && (
            <span className={`${attempt.passed ? badge.green : badge.red} px-3 py-1 text-sm`}>
              {attempt.passed ? "ผ่าน" : "ไม่ผ่าน"} (เกณฑ์ {formatScore(exam.passing_score)})
            </span>
          )}
          <p className="ml-auto text-sm text-zinc-500">ส่งเมื่อ {formatDateTime(attempt.submitted_at)}</p>
        </section>

        <section>
          <h2 className="font-semibold">คำตอบของคุณ</h2>
          <ol className="mt-3 space-y-4">
            {runnerQuestions.map((q, i) => {
              const chosen = q.choices.find((c) => c.id === answerMap[q.id]);
              const expl = questions?.find((x) => x.id === q.id)?.explanation;
              return (
                <li key={q.id} className="rounded-xl border border-zinc-200 p-5 text-sm dark:border-zinc-800">
                  <p className="font-medium"><span className="mr-2 text-zinc-500">{i + 1}.</span><span className="whitespace-pre-line">{q.stem}</span></p>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    ตอบ: {chosen ? chosen.body : <span className="italic">ไม่ได้ตอบ</span>}
                  </p>
                  {expl && (
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-zinc-50 p-3 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      <span className="font-medium">คำอธิบาย: </span>{expl}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex gap-3">
          <Link href={`/exam/${exam.slug}`} className={btn.secondary}>กลับหน้าข้อสอบ</Link>
          <Link href="/exam" className={btn.link}>ข้อสอบทั้งหมด</Link>
        </div>
      </main>
    );
  }

  // ---- Runner (owner only; staff viewing someone's open attempt see a notice) ----
  if (!isOwner) {
    return (
      <main className="space-y-4">
        <Link href="/admin/results" className="text-sm text-zinc-500 hover:underline">← ผลสอบ</Link>
        <p className="text-zinc-600 dark:text-zinc-400">ผู้เรียนยังทำข้อสอบนี้ไม่เสร็จ (เริ่มเมื่อ {formatDateTime(attempt.started_at)})</p>
      </main>
    );
  }

  const deadlineMs = exam.time_limit_minutes
    ? new Date(attempt.started_at).getTime() + exam.time_limit_minutes * 60_000
    : null;

  return (
    <main className="space-y-6">
      <div>
        <Link href={`/exam/${exam.slug}`} className="text-sm text-zinc-500 hover:underline">← {exam.title}</Link>
        <h1 className="mt-2 text-2xl font-semibold">{exam.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">คำตอบจะถูกบันทึกทันทีที่เลือก สามารถเปลี่ยนคำตอบได้จนกว่าจะกดส่ง</p>
      </div>
      {sp.error === "submit" && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          ส่งข้อสอบไม่สำเร็จ กรุณาลองใหม่
        </p>
      )}
      <ExamRunner attemptId={attempt.id} questions={runnerQuestions} initialAnswers={answerMap} deadlineMs={deadlineMs} />
    </main>
  );
}
