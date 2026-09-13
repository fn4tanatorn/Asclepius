import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDuration } from "@/lib/format";
import { badge, btn, card, input, label } from "@/components/ui";
import { Flash } from "@/components/flash";
import { ConfirmButton } from "@/components/confirm-button";
import { createVideo, deleteCourse, deleteVideo, moveVideo, updateCourse, updateVideo } from "../../actions";
import { VideoUpload } from "./video-upload";

export const metadata: Metadata = { title: "แก้ไขคอร์ส" };

export default async function AdminCoursePage({ params, searchParams }: PageProps<"/admin/courses/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireStaff(`/admin/courses/${id}`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, description, is_published, videos(id, title, description, storage_path, external_url, duration_seconds, position, is_published)")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();
  const videos = [...course.videos].sort((a, b) => a.position - b.position);

  return (
    <main className="space-y-8">
      <div>
        <Link href="/admin/courses" className="text-sm text-zinc-500 hover:underline">← คอร์สทั้งหมด</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <span className={course.is_published ? badge.green : badge.gray}>{course.is_published ? "เผยแพร่" : "ฉบับร่าง"}</span>
          <Link href={`/learn/${course.slug}`} className={btn.link}>ดูแบบผู้เรียน</Link>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <section className={card}>
            <h2 className="font-semibold">ข้อมูลคอร์ส</h2>
            <form action={updateCourse} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={course.id} />
              <label className={label}><span>ชื่อคอร์ส</span><input name="title" defaultValue={course.title} required className={input} /></label>
              <label className={label}><span>slug</span><input name="slug" defaultValue={course.slug} className={input} /></label>
              <label className={label}><span>คำอธิบาย</span><textarea name="description" rows={4} defaultValue={course.description ?? ""} className={input} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={course.is_published} /> เผยแพร่ให้ผู้เรียนเห็น</label>
              <div className="flex items-center justify-between pt-2">
                <button type="submit" className={btn.primary}>บันทึก</button>
              </div>
            </form>
            <form action={deleteCourse} className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <input type="hidden" name="id" value={course.id} />
              <ConfirmButton message="ลบคอร์สนี้พร้อมวิดีโอทั้งหมด? การกระทำนี้ย้อนกลับไม่ได้" className={btn.danger}>ลบคอร์ส</ConfirmButton>
            </form>
          </section>

          <section>
            <h2 className="font-semibold">วิดีโอ ({videos.length})</h2>
            {videos.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">ยังไม่มีวิดีโอ เพิ่มจากแผงด้านขวา</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {videos.map((v, i) => (
                  <li key={v.id} className={card}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 text-sm text-zinc-500">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{v.title}</span>
                          <span className={v.is_published ? badge.green : badge.gray}>{v.is_published ? "เผยแพร่" : "ฉบับร่าง"}</span>
                          <span className="text-xs text-zinc-500">{v.storage_path ? "ไฟล์อัปโหลด" : "ลิงก์ภายนอก"}{v.duration_seconds ? ` · ${formatDuration(v.duration_seconds)}` : ""}</span>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-zinc-500">แก้ไข</summary>
                          <form action={updateVideo} className="mt-3 space-y-3">
                            <input type="hidden" name="id" value={v.id} />
                            <input type="hidden" name="course_id" value={course.id} />
                            <label className={label}><span>ชื่อ</span><input name="title" defaultValue={v.title} required className={input} /></label>
                            <label className={label}><span>คำอธิบาย</span><textarea name="description" rows={2} defaultValue={v.description ?? ""} className={input} /></label>
                            {v.storage_path ? (
                              <p className="text-xs text-zinc-500">ไฟล์: {v.storage_path}</p>
                            ) : (
                              <label className={label}><span>ลิงก์วิดีโอ</span><input name="external_url" type="url" defaultValue={v.external_url ?? ""} required className={input} /></label>
                            )}
                            <label className={label}><span>ความยาว (วินาที)</span><input name="duration_seconds" type="number" min={0} defaultValue={v.duration_seconds ?? ""} className={input} /></label>
                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={v.is_published} /> เผยแพร่</label>
                            <button type="submit" className={btn.secondary}>บันทึก</button>
                          </form>
                        </details>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <form action={moveVideo}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="course_id" value={course.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="rounded px-2 py-1 text-sm hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="เลื่อนขึ้น">↑</button></form>
                        <form action={moveVideo}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="course_id" value={course.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === videos.length - 1} className="rounded px-2 py-1 text-sm hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="เลื่อนลง">↓</button></form>
                        <form action={deleteVideo}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="course_id" value={course.id} /><ConfirmButton message={`ลบวิดีโอ "${v.title}"?`} className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950" >ลบ</ConfirmButton></form>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className={card}>
            <h2 className="font-semibold">อัปโหลดไฟล์วิดีโอ</h2>
            <div className="mt-4"><VideoUpload courseId={course.id} /></div>
          </section>
          <section className={card}>
            <h2 className="font-semibold">เพิ่มจากลิงก์ (YouTube ฯลฯ)</h2>
            <form action={createVideo} className="mt-4 space-y-3">
              <input type="hidden" name="course_id" value={course.id} />
              <label className={label}><span>ชื่อวิดีโอ</span><input name="title" required className={input} /></label>
              <label className={label}><span>ลิงก์</span><input name="external_url" type="url" required placeholder="https://youtu.be/…" className={input} /></label>
              <label className={label}><span>ความยาว (วินาที, ไม่บังคับ)</span><input name="duration_seconds" type="number" min={0} className={input} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" /> เผยแพร่ทันที</label>
              <button type="submit" className={`${btn.secondary} w-full`}>เพิ่มวิดีโอ</button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
