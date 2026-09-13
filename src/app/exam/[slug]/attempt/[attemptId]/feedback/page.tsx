import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatScore } from "@/lib/format";
import { alert, badge, btn, card, input, label } from "@/components/ui";
import { Mascot } from "@/components/mascot";
import { submitFeedback } from "@/app/exam/actions";

export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackPage({
  params,
  searchParams,
}: PageProps<"/exam/[slug]/attempt/[attemptId]/feedback">) {
  const { slug, attemptId } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(
    `/exam/${slug}/attempt/${attemptId}/feedback`,
  );

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select(
      "id, user_id, submitted_at, score, passed, exams(slug, title, passing_score)",
    )
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || !attempt.exams || attempt.exams.slug !== slug) notFound();
  const resultPath = `/exam/${slug}/attempt/${attempt.id}`;
  if (attempt.user_id !== user.id || !attempt.submitted_at)
    redirect(resultPath);

  const { data: existing } = await supabase
    .from("exam_feedback")
    .select("id")
    .eq("attempt_id", attempt.id)
    .maybeSingle();
  if (existing) redirect(resultPath);

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Mascot
          mood={
            attempt.passed === false
              ? "oops"
              : attempt.passed === true
                ? "cheer"
                : "happy"
          }
          className="h-20 w-20 shrink-0"
        />
        <div>
          <p className="text-sm text-ink-2">{attempt.exams.title}</p>
          <h1 className="mt-1 text-2xl font-semibold">ส่งข้อสอบแล้ว!</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-2">
            <span>
              คะแนน{" "}
              <span className="text-lg font-semibold text-ink">
                {formatScore(attempt.score)}
              </span>
            </span>
            {attempt.passed != null && (
              <span className={attempt.passed ? badge.green : badge.red}>
                {attempt.passed ? "ผ่าน" : "ไม่ผ่าน"}
              </span>
            )}
          </p>
        </div>
      </div>

      {sp.error && (
        <p role="alert" className={alert.error}>
          บันทึก feedback ไม่สำเร็จ กรุณาลองใหม่
        </p>
      )}

      <form action={submitFeedback} className={`${card} space-y-5`}>
        <input type="hidden" name="attemptId" value={attempt.id} />
        <div>
          <h2 className="font-semibold">ขอ feedback หน่อยครับ</h2>
          <p className="mt-1 text-sm text-ink-2">
            ไม่บังคับ ตอบข้อเดียวหรือทั้งสองข้อก็ได้ ผู้สอนเห็นชื่อผู้ตอบ
          </p>
        </div>
        <label className={label}>
          <span>1. ความรู้สึกหรือคำแนะนำต่อ EXAM ครั้งนี้</span>
          <textarea
            name="exam_comment"
            rows={4}
            maxLength={2000}
            placeholder="เช่น ข้อไหนยากไป ภาพไม่ชัด เวลาน้อย อยากให้เพิ่มข้อแบบไหน"
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
          <Link href={resultPath} className={btn.link}>
            ข้ามไปดูเฉลย
          </Link>
          <button type="submit" className={btn.primary}>
            ส่ง feedback แล้วดูเฉลย
          </button>
        </div>
      </form>
    </main>
  );
}
