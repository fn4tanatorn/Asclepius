import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { card, input } from "@/components/ui";

export const metadata: Metadata = { title: "Feedback" };

export default async function AdminFeedbackPage({
  searchParams,
}: PageProps<"/admin/feedback">) {
  const sp = await searchParams;
  const examId = typeof sp.exam === "string" ? sp.exam : "";
  const { supabase } = await requireStaff("/admin/feedback");

  let q = supabase
    .from("exam_feedback")
    .select(
      "id, exam_comment, general_comment, created_at, exams(id, slug, title), profiles(full_name, email, line_name), exam_attempts(id, score, passed)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (examId) q = q.eq("exam_id", examId);

  const [{ data: rows }, { data: exams }] = await Promise.all([
    q,
    supabase.from("exams").select("id, title").order("title"),
  ]);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Feedback จากผู้เรียน</h1>
          <p className="mt-1 text-sm text-ink-2">
            เก็บหลังส่งข้อสอบ ข้อ 1 เกี่ยวกับข้อสอบครั้งนั้น ข้อ 2
            เกี่ยวกับเว็บไซต์และการเรียนในคลาส
          </p>
        </div>
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

      {!rows?.length ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink-2">
          ยังไม่มี feedback
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
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
    </main>
  );
}
