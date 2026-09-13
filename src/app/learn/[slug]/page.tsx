import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatDuration } from "@/lib/format";
import { alert, badge } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";

export async function generateMetadata({
  params,
}: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await requireUser(`/learn/${slug}`);
  const { data } = await supabase
    .from("courses")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  return { title: data?.title ?? "คอร์ส" };
}

export default async function CoursePage({
  params,
  searchParams,
}: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase, user } = await requireUser(`/learn/${slug}`);

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, slug, title, description, is_published, videos(id, title, duration_seconds, position, is_published)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!course) notFound();

  const videos = course.videos
    .filter((v) => v.is_published)
    .sort((a, b) => a.position - b.position);

  const [{ data: progress }, { data: courseFeedback }] = await Promise.all([
    supabase
      .from("video_progress")
      .select("video_id, seconds_watched, completed")
      .eq("user_id", user.id)
      .in(
        "video_id",
        videos.map((v) => v.id),
      ),
    supabase
      .from("course_feedback")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const byVideo = new Map((progress ?? []).map((p) => [p.video_id, p]));
  const allCompleted =
    videos.length > 0 && videos.every((v) => byVideo.get(v.id)?.completed);
  const feedbackGiven = Boolean(courseFeedback);

  return (
    <main>
      <Link href="/learn" className="text-sm text-ink-2 hover:underline">
        ← คอร์สทั้งหมด
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        {!course.is_published && (
          <span className={badge.amber}>
            ยังไม่เผยแพร่ (เห็นเฉพาะเจ้าหน้าที่)
          </span>
        )}
      </div>
      {course.description && (
        <p className="mt-2 max-w-2xl whitespace-pre-line text-ink-2">
          {course.description}
        </p>
      )}

      {sp.feedback === "thanks" && (
        <p role="status" className={`mt-4 ${alert.ok}`}>
          ขอบคุณสำหรับ feedback ครับ
        </p>
      )}
      {allCompleted && !feedbackGiven && sp.feedback !== "thanks" && (
        <p
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${alert.warn}`}
        >
          <span>ดูจบคอร์สนี้แล้ว! ขอ feedback สักครู่ได้ไหม</span>
          <Link
            href={`/learn/${course.slug}/feedback`}
            className="font-medium underline underline-offset-4"
          >
            ให้ feedback
          </Link>
        </p>
      )}

      {videos.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            mood="sleepy"
            title="ยังไม่มีวิดีโอในคอร์สนี้"
            description="ผู้สอนกำลังเตรียมเนื้อหา กลับมาดูใหม่อีกครั้งนะ"
          />
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-line rounded-xl border border-line">
          {videos.map((v, i) => {
            const p = byVideo.get(v.id);
            return (
              <li key={v.id}>
                <Link
                  href={`/learn/${course.slug}/${v.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                      p?.completed
                        ? "bg-mint text-white"
                        : "bg-surface-2 text-ink-2"
                    }`}
                    aria-label={p?.completed ? "ดูจบแล้ว" : undefined}
                  >
                    {p?.completed ? "✓" : i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{v.title}</span>
                    {p && !p.completed && p.seconds_watched > 0 && (
                      <span className="block text-xs text-ink-2">
                        ดูค้างไว้ที่ {formatDuration(p.seconds_watched)}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-ink-2">
                    {formatDuration(v.duration_seconds)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
