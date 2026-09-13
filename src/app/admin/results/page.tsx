import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { badge, input } from "@/components/ui";

export const metadata: Metadata = { title: "ผลสอบ" };

export default async function AdminResultsPage({ searchParams }: PageProps<"/admin/results">) {
  const sp = await searchParams;
  const examId = typeof sp.exam === "string" ? sp.exam : "";
  const { supabase } = await requireStaff("/admin/results");

  let q = supabase
    .from("exam_attempts")
    .select("id, score, passed, started_at, submitted_at, exams(id, slug, title), profiles(full_name, email)")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (examId) q = q.eq("exam_id", examId);

  const [{ data: attempts }, { data: exams }] = await Promise.all([
    q,
    supabase.from("exams").select("id, title").order("title"),
  ]);

  const scores = (attempts ?? []).map((a) => Number(a.score ?? 0));
  const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
  const passCount = (attempts ?? []).filter((a) => a.passed).length;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">ผลสอบ</h1>
        <form method="get" className="flex items-center gap-2 text-sm">
          <select name="exam" defaultValue={examId} className={input}>
            <option value="">ทุกข้อสอบ</option>
            {exams?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">กรอง</button>
        </form>
      </div>

      {attempts && attempts.length > 0 && (
        <p className="text-sm text-zinc-500">
          {attempts.length} ครั้ง · เฉลี่ย {avg != null ? formatScore(avg) : "-"} · ผ่าน {passCount} ครั้ง
        </p>
      )}

      {!attempts?.length ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">ยังไม่มีผลสอบ</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">ผู้เรียน</th>
                <th className="px-4 py-2 font-medium">ข้อสอบ</th>
                <th className="px-4 py-2 font-medium">ส่งเมื่อ</th>
                <th className="px-4 py-2 text-right font-medium">คะแนน</th>
                <th className="px-4 py-2 font-medium">ผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-4 py-2">
                    <span className="block font-medium">{a.profiles?.full_name || "ไม่ระบุชื่อ"}</span>
                    <span className="block text-xs text-zinc-500">{a.profiles?.email}</span>
                  </td>
                  <td className="px-4 py-2"><Link href={`/exam/${a.exams?.slug}/attempt/${a.id}`} className="hover:underline">{a.exams?.title}</Link></td>
                  <td className="px-4 py-2 text-zinc-500">{formatDateTime(a.submitted_at)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatScore(a.score)}</td>
                  <td className="px-4 py-2">{a.passed == null ? <span className="text-zinc-400">-</span> : <span className={a.passed ? badge.green : badge.red}>{a.passed ? "ผ่าน" : "ไม่ผ่าน"}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
