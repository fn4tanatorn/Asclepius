import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { badge, btn, card, input, label } from "@/components/ui";
import { Flash } from "@/components/flash";
import { EmptyState } from "@/components/empty-state";
import { createExam } from "../actions";
import { examAvailability } from "@/lib/exam-status";

export const metadata: Metadata = { title: "จัดการข้อสอบ" };

export default async function AdminExamsPage({
  searchParams,
}: PageProps<"/admin/exams">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("/admin/exams");
  const [{ data: exams }, { data: courses }] = await Promise.all([
    supabase
      .from("exams")
      .select(
        "id, slug, title, is_published, time_limit_minutes, passing_score, opens_at, closes_at, max_attempts, questions(id), courses(title), exam_attempts(id)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title").order("title"),
  ]);

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">ข้อสอบ</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          {!exams?.length ? (
            <EmptyState
              title="ยังไม่มีข้อสอบ"
              description="สร้างข้อสอบแรกจากฟอร์มด้านข้าง"
            />
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {exams.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/exams/${e.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2"
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{e.title}</span>
                      <span className="block text-xs text-ink-2">
                        {e.courses?.title ? `${e.courses.title} · ` : ""}
                        {e.questions.length} ข้อ · ส่งแล้ว{" "}
                        {e.exam_attempts.length} ครั้ง
                        {e.max_attempts != null
                          ? ` · จำกัด ${e.max_attempts} ครั้ง/คน`
                          : ""}
                        {e.is_published
                          ? ` · ${examAvailability(e).label}`
                          : ""}
                      </span>
                    </span>
                    <span className={e.is_published ? badge.green : badge.gray}>
                      {e.is_published ? "เผยแพร่" : "ฉบับร่าง"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className={card}>
          <h2 className="font-semibold">สร้างข้อสอบใหม่</h2>
          <form action={createExam} className="mt-4 space-y-3">
            <label className={label}>
              <span>ชื่อข้อสอบ</span>
              <input name="title" required className={input} />
            </label>
            <label className={label}>
              <span>slug (ไม่บังคับ)</span>
              <input name="slug" className={input} />
            </label>
            <label className={label}>
              <span>คอร์สที่เกี่ยวข้อง</span>
              <select name="course_id" className={input} defaultValue="">
                <option value="">— ไม่ระบุ —</option>
                {courses?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                <span>เวลา (นาที)</span>
                <input
                  name="time_limit_minutes"
                  type="number"
                  min={1}
                  className={input}
                />
              </label>
              <label className={label}>
                <span>เกณฑ์ผ่าน (%)</span>
                <input
                  name="passing_score"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className={input}
                />
              </label>
            </div>
            <label className={label}>
              <span>จำนวนครั้งที่ทำได้ (ว่าง = ไม่จำกัด)</span>
              <input
                name="max_attempts"
                type="number"
                min={1}
                step={1}
                className={input}
              />
            </label>
            <button type="submit" className={`${btn.primary} w-full`}>
              สร้างข้อสอบ
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
