import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { card, input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Feedback" };

export default async function AdminFeedbackPage({
  searchParams,
}: PageProps<"/admin/feedback">) {
  const sp = await searchParams;
  const examId = typeof sp.exam === "string" ? sp.exam : "";
  const courseId = typeof sp.course === "string" ? sp.course : "";
  const { supabase } = await requireStaff("/admin/feedback");

  let examQ = supabase
    .from("exam_feedback")
    .select(
      "id, exam_comment, general_comment, created_at, exams(id, slug, title), profiles(full_name, email, line_name), exam_attempts(id, score, passed)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (examId) examQ = examQ.eq("exam_id", examId);

  let courseQ = supabase
    .from("course_feedback")
    .select(
      "id, course_comment, general_comment, created_at, courses(id, slug, title), profiles(full_name, email, line_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (courseId) courseQ = courseQ.eq("course_id", courseId);

  const [
    { data: examRows },
    { data: exams },
    { data: courseRows },
    { data: courses },
  ] = await Promise.all([
    examQ,
    supabase.from("exams").select("id, title").order("title"),
    courseQ,
    supabase.from("courses").select("id, title").order("title"),
  ]);

  return (
    <main className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Feedback จากผู้เรียน</h1>
        <p className="mt-1 text-sm text-ink-2">
          หลังส่งข้อสอบและหลังดูจบคอร์ส ผู้เรียนจะถูกถามความรู้สึก 2 ข้อ:
          ต่อครั้งนั้นๆ และต่อเว็บไซต์/การเรียนในคลาสโดยรวม
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Feedback ข้อสอบ</h2>
          <form method="get" className="flex items-center gap-2 text-sm">
            <select name="exam" defaultValue={examId} className={input}>
              <option value="">ทุกข้อสอบ</option>
              {exams?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-2 hover:bg-surface-2"
            >
              กรอง
            </button>
          </form>
        </div>

        {!examRows?.length ? (
          <EmptyState mood="sleepy" title="ยังไม่มี feedback ข้อสอบ" />
        ) : (
          <ul className="space-y-3">
            {examRows.map((r) => (
              <li key={r.id} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">
                      {r.profiles?.full_name ||
                        r.profiles?.email ||
                        "ไม่ทราบชื่อ"}
                    </span>
                    <span className="text-ink-2">
                      {" "}
                      · {r.profiles?.email}
                      {r.profiles?.line_name
                        ? ` · LINE: ${r.profiles.line_name}`
                        : ""}
                    </span>
                  </span>
                  <span className="text-ink-2">
                    {formatDateTime(r.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  <Link
                    href={`/exam/${r.exams?.slug}/attempt/${r.exam_attempts?.id}`}
                    className="hover:underline"
                  >
                    {r.exams?.title}
                  </Link>
                  {r.exam_attempts && (
                    <> · คะแนน {formatScore(r.exam_attempts.score)}</>
                  )}
                </p>
                {r.exam_comment && (
                  <div className="mt-3 text-sm">
                    <p className="text-xs font-medium text-ink-2">
                      1. ต่อ EXAM ครั้งนี้
                    </p>
                    <p className="mt-1 whitespace-pre-line">{r.exam_comment}</p>
                  </div>
                )}
                {r.general_comment && (
                  <div className="mt-3 text-sm">
                    <p className="text-xs font-medium text-ink-2">
                      2. ต่อเว็บไซต์ / การเรียนในคลาส
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {r.general_comment}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Feedback คอร์ส</h2>
          <form method="get" className="flex items-center gap-2 text-sm">
            <select name="course" defaultValue={courseId} className={input}>
              <option value="">ทุกคอร์ส</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-2 hover:bg-surface-2"
            >
              กรอง
            </button>
          </form>
        </div>

        {!courseRows?.length ? (
          <EmptyState mood="sleepy" title="ยังไม่มี feedback คอร์ส" />
        ) : (
          <ul className="space-y-3">
            {courseRows.map((r) => (
              <li key={r.id} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">
                      {r.profiles?.full_name ||
                        r.profiles?.email ||
                        "ไม่ทราบชื่อ"}
                    </span>
                    <span className="text-ink-2">
                      {" "}
                      · {r.profiles?.email}
                      {r.profiles?.line_name
                        ? ` · LINE: ${r.profiles.line_name}`
                        : ""}
                    </span>
                  </span>
                  <span className="text-ink-2">
                    {formatDateTime(r.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-2">
                  <Link
                    href={`/learn/${r.courses?.slug}`}
                    className="hover:underline"
                  >
                    {r.courses?.title}
                  </Link>
                </p>
                {r.course_comment && (
                  <div className="mt-3 text-sm">
                    <p className="text-xs font-medium text-ink-2">
                      1. ต่อเนื้อหาคอร์สนี้
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {r.course_comment}
                    </p>
                  </div>
                )}
                {r.general_comment && (
                  <div className="mt-3 text-sm">
                    <p className="text-xs font-medium text-ink-2">
                      2. ต่อเว็บไซต์ / การเรียนในคลาส
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {r.general_comment}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
