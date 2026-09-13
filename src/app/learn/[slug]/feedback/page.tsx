import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { alert, btn, card, input, label } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import { submitCourseFeedback } from "@/app/learn/actions";

export const metadata: Metadata = { title: "Feedback" };

export default async function CourseFeedbackPage({
  params,
  searchParams,
}: PageProps<"/learn/[slug]/feedback">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/learn/${slug}/feedback`);
  const coursePath = `/learn/${slug}`;

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, videos(id, is_published)")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) notFound();

  const { data: existing } = await supabase
    .from("course_feedback")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(coursePath);

  const publishedVideoIds = course.videos
    .filter((v) => v.is_published)
    .map((v) => v.id);
  if (publishedVideoIds.length === 0) redirect(coursePath);

  const { data: progress } = await supabase
    .from("video_progress")
    .select("video_id, completed")
    .eq("user_id", user.id)
    .in("video_id", publishedVideoIds)
    .eq("completed", true);
  const allCompleted =
    (progress?.length ?? 0) >= publishedVideoIds.length &&
    publishedVideoIds.every((id) => progress?.some((p) => p.video_id === id));
  if (!allCompleted) redirect(coursePath);

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Mascot mood="cheer" className="h-20 w-20 shrink-0" />
        <div>
          <p className="text-sm text-ink-2">{course.title}</p>
          <h1 className="mt-1 text-2xl font-semibold">ดูจบคอร์สนี้แล้ว!</h1>
        </div>
      </div>

      {sp.error && (
        <p role="alert" className={alert.error}>
          บันทึก feedback ไม่สำเร็จ กรุณาลองใหม่
        </p>
      )}

      <form action={submitCourseFeedback} className={`${card} space-y-5`}>
        <input type="hidden" name="courseId" value={course.id} />
        <input type="hidden" name="slug" value={course.slug} />
        <div>
          <h2 className="font-semibold">ขอ feedback หน่อยครับ</h2>
          <p className="mt-1 text-sm text-ink-2">
            ไม่บังคับ ตอบข้อเดียวหรือทั้งสองข้อก็ได้ ผู้สอนเห็นชื่อผู้ตอบ
          </p>
        </div>
        <label className={label}>
          <span>1. ความรู้สึกหรือคำแนะนำต่อเนื้อหาคอร์สนี้</span>
          <textarea
            name="course_comment"
            rows={4}
            maxLength={2000}
            placeholder="เช่น วิดีโอไหนดีมาก อยากให้เพิ่มเนื้อหาส่วนไหน อธิบายส่วนไหนเข้าใจยาก"
            className={input}
          />
        </label>
        <label className={label}>
          <span>
            2. ความรู้สึกหรือคำแนะนำต่อการใช้งานเว็บไซต์
            หรือการเรียนรู้เนื้อหาแพทย์ในคลาส
          </span>
          <textarea
            name="general_comment"
            rows={4}
            maxLength={2000}
            placeholder="เช่น เว็บใช้ยากตรงไหน อยากได้ฟีเจอร์อะไร เนื้อหาส่วนไหนอยากให้สอนเพิ่ม"
            className={input}
          />
        </label>
        <div className="flex items-center justify-between">
          <Link href={coursePath} className={btn.link}>
            ข้ามไปก่อน
          </Link>
          <button type="submit" className={btn.primary}>
            ส่ง feedback
          </button>
        </div>
      </form>
    </main>
  );
}
