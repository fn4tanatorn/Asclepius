import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { formatScore } from "@/lib/format";
import { badge, card } from "@/components/ui";
import { examAvailability } from "@/lib/exam-status";

export const metadata: Metadata = { title: "ข้อสอบ" };

export default async function ExamListPage() {
  const { supabase, user } = await requireUser("/exam");

  const [{ data: exams }, { data: attempts }] = await Promise.all([
    supabase
      .from("exams")
      .select(
        "id, slug, title, description, time_limit_minutes, passing_score, is_published, opens_at, closes_at, max_attempts, questions(id), courses(title)",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("exam_attempts")
      .select("id, exam_id, submitted_at, score, passed, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
  ]);

  const latestByExam = new Map<string, NonNullable<typeof attempts>[number]>();
  const openByExam = new Map<string, string>();
  const usedByExam = new Map<string, number>();
  for (const a of attempts ?? []) {
    usedByExam.set(a.exam_id, (usedByExam.get(a.exam_id) ?? 0) + 1);
    if (!a.submitted_at && !openByExam.has(a.exam_id))
      openByExam.set(a.exam_id, a.id);
    if (a.submitted_at && !latestByExam.has(a.exam_id))
      latestByExam.set(a.exam_id, a);
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">ข้อสอบ</h1>
      {!exams?.length ? (
        <p className="mt-10 rounded-lg border border-dashed border-line p-8 text-center text-ink-2">
          ยังไม่มีข้อสอบที่เผยแพร่
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {exams.map((e) => {
            const latest = latestByExam.get(e.id);
            const open = openByExam.get(e.id);
            const avail = examAvailability(e);
            const used = usedByExam.get(e.id) ?? 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/exam/${e.slug}`}
                  className={`${card} block h-full hover:border-brand/40`}
                >
                  {e.courses?.title && (
                    <p className="text-xs text-ink-2">{e.courses.title}</p>
                  )}
                  <h2 className="font-semibold">{e.title}</h2>
                  {e.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                      {e.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                    <span>{e.questions.length} ข้อ</span>
                    {e.time_limit_minutes && (
                      <span>{e.time_limit_minutes} นาที</span>
                    )}
                    {e.passing_score != null && (
                      <span>ผ่านที่ {formatScore(e.passing_score)}</span>
                    )}
                    {e.max_attempts != null && (
                      <span>
                        ทำได้ {e.max_attempts} ครั้ง
                        {used ? ` (ใช้ ${used})` : ""}
                      </span>
                    )}
                    <span
                      className={
                        avail.state === "open"
                          ? ""
                          : avail.state === "upcoming"
                            ? "text-lemon"
                            : "text-danger"
                      }
                    >
                      {avail.label}
                    </span>
                    <span className="ml-auto">
                      {open ? (
                        <span className={badge.amber}>ทำค้างอยู่</span>
                      ) : latest ? (
                        <span
                          className={
                            latest.passed === false
                              ? badge.red
                              : latest.passed
                                ? badge.green
                                : badge.gray
                          }
                        >
                          ล่าสุด {formatScore(latest.score)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
