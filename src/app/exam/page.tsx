import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { formatScore } from "@/lib/format";
import { badge, card } from "@/components/ui";

export const metadata: Metadata = { title: "ข้อสอบ" };

export default async function ExamListPage() {
  const { supabase, user } = await requireUser("/exam");

  const [{ data: exams }, { data: attempts }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, slug, title, description, time_limit_minutes, passing_score, questions(id), courses(title)")
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
  for (const a of attempts ?? []) {
    if (!a.submitted_at && !openByExam.has(a.exam_id)) openByExam.set(a.exam_id, a.id);
    if (a.submitted_at && !latestByExam.has(a.exam_id)) latestByExam.set(a.exam_id, a);
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">ข้อสอบ</h1>
      {!exams?.length ? (
        <p className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          ยังไม่มีข้อสอบที่เผยแพร่
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {exams.map((e) => {
            const latest = latestByExam.get(e.id);
            const open = openByExam.get(e.id);
            return (
              <li key={e.id}>
                <Link href={`/exam/${e.slug}`} className={`${card} block h-full hover:border-zinc-400 dark:hover:border-zinc-600`}>
                  {e.courses?.title && <p className="text-xs text-zinc-500">{e.courses.title}</p>}
                  <h2 className="font-semibold">{e.title}</h2>
                  {e.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{e.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>{e.questions.length} ข้อ</span>
                    {e.time_limit_minutes && <span>{e.time_limit_minutes} นาที</span>}
                    {e.passing_score != null && <span>ผ่านที่ {formatScore(e.passing_score)}</span>}
                    <span className="ml-auto">
                      {open ? (
                        <span className={badge.amber}>ทำค้างอยู่</span>
                      ) : latest ? (
                        <span className={latest.passed === false ? badge.red : latest.passed ? badge.green : badge.gray}>
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
