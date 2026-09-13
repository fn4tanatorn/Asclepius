import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { badge, btn, input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "ผลสอบ" };

export default async function AdminResultsPage({
  searchParams,
}: PageProps<"/admin/results">) {
  const sp = await searchParams;
  const examId = typeof sp.exam === "string" ? sp.exam : "";
  const { supabase } = await requireStaff("/admin/results");

  let q = supabase
    .from("exam_attempts")
    .select(
      "id, score, passed, started_at, submitted_at, exams(id, slug, title), profiles(full_name, email, line_name)",
    )
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (examId) q = q.eq("exam_id", examId);

  const [{ data: attempts }, { data: exams }] = await Promise.all([
    q,
    supabase.from("exams").select("id, title").order("title"),
  ]);

  const scores = (attempts ?? []).map((a) => Number(a.score ?? 0));
  const avg = scores.length
    ? scores.reduce((s, x) => s + x, 0) / scores.length
    : null;
  const passCount = (attempts ?? []).filter((a) => a.passed).length;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">ผลสอบ</h1>
        <div className="flex items-center gap-2 text-sm">
          <form method="get" className="flex items-center gap-2">
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
          <a
            href={`/admin/results/export${examId ? `?exam=${examId}` : ""}`}
            className={btn.secondary}
          >
            ส่งออก CSV
          </a>
        </div>
      </div>

      {attempts && attempts.length > 0 && (
        <p className="text-sm text-ink-2">
          {attempts.length} ครั้ง · เฉลี่ย{" "}
          {avg != null ? formatScore(avg) : "-"} · ผ่าน {passCount} ครั้ง
        </p>
      )}

      {!attempts?.length ? (
        <EmptyState mood="sleepy" title="ยังไม่มีผลสอบ" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-ink-2">
              <tr>
                <th className="px-4 py-2 font-medium">ผู้เรียน</th>
                <th className="px-4 py-2 font-medium">ข้อสอบ</th>
                <th className="px-4 py-2 font-medium">ส่งเมื่อ</th>
                <th className="px-4 py-2 text-right font-medium">คะแนน</th>
                <th className="px-4 py-2 font-medium">ผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2">
                    <span className="block font-medium">
                      {a.profiles?.full_name || "ไม่ระบุชื่อ"}
                    </span>
                    <span className="block text-xs text-ink-2">
                      {a.profiles?.email}
                      {a.profiles?.line_name
                        ? ` · LINE: ${a.profiles.line_name}`
                        : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/exam/${a.exams?.slug}/attempt/${a.id}`}
                      className="hover:underline"
                    >
                      {a.exams?.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ink-2">
                    {formatDateTime(a.submitted_at)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatScore(a.score)}
                  </td>
                  <td className="px-4 py-2">
                    {a.passed == null ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <span className={a.passed ? badge.green : badge.red}>
                        {a.passed ? "ผ่าน" : "ไม่ผ่าน"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
