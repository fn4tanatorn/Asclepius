import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { badge, btn, card } from "@/components/ui";
import { startAttempt } from "../actions";
import { attemptsLabel, attemptsLeft, examAvailability } from "@/lib/exam-status";

export async function generateMetadata({ params }: PageProps<"/exam/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await requireUser(`/exam/${slug}`);
  const { data } = await supabase.from("exams").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "ข้อสอบ" };
}

export default async function ExamDetailPage({ params, searchParams }: PageProps<"/exam/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/exam/${slug}`);

  const { data: exam } = await supabase
    .from("exams")
    .select("id, slug, title, description, time_limit_minutes, passing_score, is_published, opens_at, closes_at, max_attempts, questions(id), courses(title, slug)")
    .eq("slug", slug)
    .maybeSingle();
  if (!exam) notFound();

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("id, started_at, submitted_at, score, passed")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const open = attempts?.find((a) => !a.submitted_at);
  const done = attempts?.filter((a) => a.submitted_at) ?? [];
  const used = attempts?.length ?? 0;
  const avail = examAvailability(exam);
  const canStart = exam.is_published && exam.questions.length > 0 && avail.state === "open" && attemptsLeft(exam.max_attempts, used);
  const ERR: Record<string, string> = {
    start: "เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่",
    closed: "ข้อสอบนี้ไม่อยู่ในช่วงเวลาที่เปิดให้ทำ",
    limit: "คุณใช้สิทธิ์ทำข้อสอบนี้ครบแล้ว",
  };
  const errMsg = typeof sp.error === "string" ? ERR[sp.error] : null;

  return (
    <main className="space-y-6">
      <div>
        <Link href="/exam" className="text-sm text-zinc-500 hover:underline">← ข้อสอบทั้งหมด</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{exam.title}</h1>
          {!exam.is_published && <span className={badge.amber}>ยังไม่เผยแพร่ (เห็นเฉพาะเจ้าหน้าที่)</span>}
        </div>
        {exam.courses?.title && (
          <p className="mt-1 text-sm text-zinc-500">
            คอร์ส: <Link href={`/learn/${exam.courses.slug}`} className="hover:underline">{exam.courses.title}</Link>
          </p>
        )}
      </div>

      {errMsg && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errMsg}
        </p>
      )}

      <section className={card}>
        {exam.description && <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">{exam.description}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <div><dt className="text-zinc-500">จำนวนข้อ</dt><dd className="font-medium">{exam.questions.length}</dd></div>
          <div><dt className="text-zinc-500">เวลา</dt><dd className="font-medium">{exam.time_limit_minutes ? `${exam.time_limit_minutes} นาที` : "ไม่จำกัด"}</dd></div>
          <div><dt className="text-zinc-500">เกณฑ์ผ่าน</dt><dd className="font-medium">{exam.passing_score != null ? formatScore(exam.passing_score) : "ไม่กำหนด"}</dd></div>
          <div><dt className="text-zinc-500">จำนวนครั้ง</dt><dd className="font-medium">{attemptsLabel(exam.max_attempts, used)}</dd></div>
          <div><dt className="text-zinc-500">ช่วงเวลา</dt><dd className={`font-medium ${avail.state === "open" ? "" : avail.state === "upcoming" ? "text-amber-600" : "text-red-600"}`}>{avail.label}</dd></div>
        </dl>
        <div className="mt-6">
          {open ? (
            <Link href={`/exam/${exam.slug}/attempt/${open.id}`} className={btn.primary}>ทำข้อสอบต่อ</Link>
          ) : canStart ? (
            <form action={startAttempt}>
              <input type="hidden" name="slug" value={exam.slug} />
              <button type="submit" className={btn.primary}>{done.length ? "ทำข้อสอบอีกครั้ง" : "เริ่มทำข้อสอบ"}</button>
            </form>
          ) : (
            <p className="text-sm text-zinc-500">
              {!exam.is_published || exam.questions.length === 0
                ? "ข้อสอบนี้ยังไม่พร้อมให้ทำ"
                : avail.state === "upcoming"
                  ? "ยังไม่ถึงเวลาเปิดข้อสอบ"
                  : avail.state === "closed"
                    ? "ข้อสอบนี้ปิดแล้ว"
                    : "คุณใช้สิทธิ์ทำข้อสอบนี้ครบแล้ว"}
            </p>
          )}
        </div>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-semibold">ประวัติการทำข้อสอบ</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            {done.map((a) => (
              <li key={a.id}>
                <Link href={`/exam/${exam.slug}/attempt/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span className="text-zinc-600 dark:text-zinc-400">{formatDateTime(a.submitted_at)}</span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatScore(a.score)}</span>
                    {a.passed != null && (
                      <span className={a.passed ? badge.green : badge.red}>{a.passed ? "ผ่าน" : "ไม่ผ่าน"}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
