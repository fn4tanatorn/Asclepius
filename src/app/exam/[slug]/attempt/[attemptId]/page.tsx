import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { badge, btn, card } from "@/components/ui";
import { signQuestionImages } from "@/lib/storage";
import { AnswerDiff } from "@/components/answer-diff";
import { deadlineOf } from "@/lib/exam-status";
import { ExamRunner, type RunnerQuestion } from "./exam-runner";

export const metadata: Metadata = { title: "ทำข้อสอบ" };

export default async function AttemptPage({ params, searchParams }: PageProps<"/exam/[slug]/attempt/[attemptId]">) {
  const { slug, attemptId } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/exam/${slug}/attempt/${attemptId}`);

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, user_id, started_at, submitted_at, score, passed, exams(id, slug, title, time_limit_minutes, passing_score, closes_at)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || !attempt.exams || attempt.exams.slug !== slug) notFound();
  const exam = attempt.exams;
  const isOwner = attempt.user_id === user.id;

  const { data: questions } = await supabase
    .from("questions")
    .select("id, kind, stem, explanation, points, position, image_path")
    .eq("exam_id", exam.id)
    .order("position");
  const qIds = new Set((questions ?? []).map((q) => q.id));

  const [{ data: choices }, { data: answers }, imageUrls] = await Promise.all([
    supabase
      .from("exam_choices")
      .select("id, question_id, body, position")
      .in("question_id", [...qIds])
      .order("position"),
    supabase.from("attempt_answers").select("question_id, choice_id, text_answer, is_correct").eq("attempt_id", attempt.id),
    signQuestionImages(supabase, (questions ?? []).map((q) => q.image_path)),
  ]);
  const choicesByQ = new Map<string, { id: string; body: string }[]>();
  for (const c of choices ?? []) {
    if (!c.id || !c.question_id || !qIds.has(c.question_id)) continue;
    const arr = choicesByQ.get(c.question_id) ?? [];
    arr.push({ id: c.id, body: c.body ?? "" });
    choicesByQ.set(c.question_id, arr);
  }
  const answerMap: Record<string, string> = {};
  const correctMap: Record<string, boolean | null> = {};
  for (const a of answers ?? []) {
    const v = a.choice_id ?? a.text_answer;
    if (v) answerMap[a.question_id] = v;
    correctMap[a.question_id] = a.is_correct;
  }

  const runnerQuestions: RunnerQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    kind: q.kind,
    stem: q.stem,
    points: Number(q.points),
    imageUrl: q.image_path ? imageUrls.get(q.image_path) ?? null : null,
    choices: choicesByQ.get(q.id) ?? [],
  }));

  // ---- Result view ----
  if (attempt.submitted_at) {
    // Answer keys are only reachable through this RPC (own submitted attempt + exam allows reveal).
    const [{ data: review }, { data: feedback }] = await Promise.all([
      supabase.rpc("get_attempt_review", { p_attempt_id: attempt.id }),
      supabase.from("exam_feedback").select("id").eq("attempt_id", attempt.id).maybeSingle(),
    ]);
    const reviewByQ = new Map((review ?? []).map((r) => [r.question_id, r]));
    const reveal = (review?.length ?? 0) > 0;
    return (
      <main className="space-y-6">
        <div>
          <Link href={`/exam/${exam.slug}`} className="text-sm text-zinc-500 hover:underline">← {exam.title}</Link>
          <h1 className="mt-2 text-2xl font-semibold">ผลการสอบ</h1>
        </div>

        {sp.feedback === "thanks" && (
          <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            ขอบคุณสำหรับ feedback ครับ
          </p>
        )}
        {isOwner && !feedback && sp.feedback !== "thanks" && (
          <p className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <span>ยังไม่ได้ให้ feedback สำหรับข้อสอบครั้งนี้ ใช้เวลาไม่ถึงนาที</span>
            <Link href={`/exam/${exam.slug}/attempt/${attempt.id}/feedback`} className="font-medium underline underline-offset-4">ให้ feedback</Link>
          </p>
        )}
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
          {!reveal && <p className="mt-1 text-sm text-zinc-500">ข้อสอบนี้ไม่แสดงเฉลย</p>}
          <ol className="mt-3 space-y-4">
            {runnerQuestions.map((q, i) => {
              const raw = answerMap[q.id];
              const shown = q.kind === "choice" ? q.choices.find((c) => c.id === raw)?.body : raw;
              const expl = questions?.find((x) => x.id === q.id)?.explanation;
              const ok = correctMap[q.id];
              const rv = reviewByQ.get(q.id);
              const fuzzyHit = ok === true && q.kind === "text" && (rv?.distance ?? 0) > 0;
              const correctChoice = rv?.correct_choice_id ? q.choices.find((c) => c.id === rv.correct_choice_id) : null;
              return (
                <li key={q.id} className={`rounded-xl border p-5 text-sm ${ok === true ? "border-emerald-300 dark:border-emerald-900" : ok === false ? "border-red-300 dark:border-red-900" : "border-zinc-200 dark:border-zinc-800"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium"><span className="mr-2 text-zinc-500">{i + 1}.</span><span className="whitespace-pre-line">{q.stem}</span></p>
                    {ok != null && <span className={ok ? badge.green : badge.red}>{ok ? (fuzzyHit ? "ถูก (สะกดคลาดเล็กน้อย)" : "ถูก") : "ผิด"}</span>}
                  </div>
                  {q.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.imageUrl} alt="" className="mt-3 max-h-64 w-auto max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" />
                  )}
                  {q.kind === "text" && rv?.closest_answer && raw ? (
                    <div className="mt-3"><AnswerDiff answer={raw} expected={rv.closest_answer} /></div>
                  ) : (
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                      ตอบ: {shown ? shown : <span className="italic">ไม่ได้ตอบ</span>}
                    </p>
                  )}
                  {rv && q.kind === "text" && rv.accepted_answers && (
                    <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                      <span className="font-medium">เฉลย: </span>{rv.accepted_answers.join(" / ")}
                    </p>
                  )}
                  {rv && q.kind === "choice" && correctChoice && (
                    <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                      <span className="font-medium">เฉลย: </span>{correctChoice.body}
                    </p>
                  )}
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

  const deadlineMs = deadlineOf(attempt.started_at, exam.time_limit_minutes, exam.closes_at);

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
