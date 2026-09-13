import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { alert, badge, btn, card } from "@/components/ui";
import { startAttempt } from "../actions";
import {
  attemptsLabel,
  attemptsLeft,
  examAvailability,
} from "@/lib/exam-status";

export async function generateMetadata({
  params,
}: PageProps<"/exam/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await requireUser(`/exam/${slug}`);
  const { data } = await supabase
    .from("exams")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  return { title: data?.title ?? "ข้อสอบ" };
}

export default async function ExamDetailPage({
  params,
  searchParams,
}: PageProps<"/exam/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/exam/${slug}`);

  const { data: exam } = await supabase
    .from("exams")
    .select(
      "id, slug, title, description, time_limit_minutes, passing_score, is_published, opens_at, closes_at, max_attempts, questions(id), courses(title, slug)",
    )
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
  const canStart =
    exam.is_published &&
    exam.questions.length > 0 &&
    avail.state === "open" &&
    attemptsLeft(exam.max_attempts, used);
  const ERR: Record<string, string> = {
    start: "เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่",
    closed: "ข้อสอบนี้ไม่อยู่ในช่วงเวลาที่เปิดให้ทำ",
    limit: "คุณใช้สิทธิ์ทำข้อสอบนี้ครบแล้ว",
  };
  const errMsg = typeof sp.error === "string" ? ERR[sp.error] : null;

  return (
    <main className="space-y-6">
      <div>
        <Link href="/exam" className="text-sm text-ink-2 hover:underline">
          ← ข้อสอบทั้งหมด
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{exam.title}</h1>
          {!exam.is_published && (
            <span className={badge.amber}>
              ยังไม่เผยแพร่ (เห็นเฉพาะเจ้าหน้าที่)
            </span>
          )}
        </div>
        {exam.courses?.title && (
          <p className="mt-1 text-sm text-ink-2">
            คอร์ส:{" "}
            <Link
              href={`/learn/${exam.courses.slug}`}
              className="hover:underline"
            >
              {exam.courses.title}
            </Link>
          </p>
        )}
      </div>

      {errMsg && (
        <p role="alert" className={alert.error}>
          {errMsg}
        </p>
      )}

      <section className={card}>
        {exam.description && (
          <p className="whitespace-pre-line text-ink-2">{exam.description}</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <div>
            <dt className="text-ink-2">จำนวนข้อ</dt>
            <dd className="font-medium">{exam.questions.length}</dd>
          </div>
          <div>
            <dt className="text-ink-2">เวลา</dt>
            <dd className="font-medium">
              {exam.time_limit_minutes
                ? `${exam.time_limit_minutes} นาที`
                : "ไม่จำกัด"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">เกณฑ์ผ่าน</dt>
            <dd className="font-medium">
              {exam.passing_score != null
                ? formatScore(exam.passing_score)
                : "ไม่กำหนด"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">จำนวนครั้ง</dt>
            <dd className="font-medium">
              {attemptsLabel(exam.max_attempts, used)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">ช่วงเวลา</dt>
            <dd
              className={`font-medium ${avail.state === "open" ? "" : avail.state === "upcoming" ? "text-lemon" : "text-danger"}`}
            >
              {avail.label}
            </dd>
          </div>
        </dl>
        <div className="mt-6">
          {open ? (
            <Link
              href={`/exam/${exam.slug}/attempt/${open.id}`}
              className={btn.primary}
            >
              ทำข้อสอบต่อ
            </Link>
          ) : canStart ? (
            <form action={startAttempt}>
              <input type="hidden" name="slug" value={exam.slug} />
              <button type="submit" className={btn.primary}>
                {done.length ? "ทำข้อสอบอีกครั้ง" : "เริ่มทำข้อสอบ"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-ink-2">
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
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
            {done.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/exam/${exam.slug}/attempt/${a.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-2"
                >
                  <span className="text-ink-2">
                    {formatDateTime(a.submitted_at)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatScore(a.score)}</span>
                    {a.passed != null && (
                      <span className={a.passed ? badge.green : badge.red}>
                        {a.passed ? "ผ่าน" : "ไม่ผ่าน"}
                      </span>
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
