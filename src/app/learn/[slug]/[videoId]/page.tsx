import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { youtubeId } from "@/lib/format";
import { alert } from "@/components/ui";
import { VideoPlayer } from "./video-player";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 3;

export async function generateMetadata({
  params,
}: PageProps<"/learn/[slug]/[videoId]">): Promise<Metadata> {
  const { videoId } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("videos")
    .select("title")
    .eq("id", videoId)
    .maybeSingle();
  return { title: data?.title ?? "วิดีโอ" };
}

export default async function VideoPage({
  params,
}: PageProps<"/learn/[slug]/[videoId]">) {
  const { slug, videoId } = await params;
  const { supabase, user } = await requireUser(`/learn/${slug}/${videoId}`);

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, slug, title, videos(id, title, description, storage_path, external_url, position, is_published)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!course) notFound();

  const videos = course.videos
    .filter((v) => v.is_published)
    .sort((a, b) => a.position - b.position);
  const idx = videos.findIndex((v) => v.id === videoId);
  const video =
    idx >= 0 ? videos[idx] : course.videos.find((v) => v.id === videoId);
  if (!video) notFound();
  const prev = idx > 0 ? videos[idx - 1] : null;
  const next = idx >= 0 && idx < videos.length - 1 ? videos[idx + 1] : null;
  const isLastVideo = idx >= 0 && idx === videos.length - 1;

  let source: React.ComponentProps<typeof VideoPlayer>["source"] | null = null;
  if (video.storage_path) {
    const { data, error } = await supabase.storage
      .from("videos")
      .createSignedUrl(video.storage_path, SIGNED_URL_TTL_SECONDS);
    if (!error && data?.signedUrl)
      source = { kind: "file", url: data.signedUrl };
  } else if (video.external_url) {
    const yt = youtubeId(video.external_url);
    source = yt
      ? { kind: "youtube", id: yt }
      : { kind: "external", url: video.external_url };
  }

  const [{ data: progress }, { data: courseFeedback }] = await Promise.all([
    supabase
      .from("video_progress")
      .select("seconds_watched, completed")
      .eq("user_id", user.id)
      .eq("video_id", video.id)
      .maybeSingle(),
    // Only matters on the last video; harmless (and cheap, unique-indexed) otherwise.
    supabase
      .from("course_feedback")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <main className="space-y-6">
      <div>
        <Link
          href={`/learn/${course.slug}`}
          className="text-sm text-ink-2 hover:underline"
        >
          ← {course.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{video.title}</h1>
      </div>

      {source ? (
        <VideoPlayer
          videoId={video.id}
          source={source}
          initialSeconds={progress?.seconds_watched ?? 0}
          initialCompleted={progress?.completed ?? false}
          isLastVideo={isLastVideo}
          hasCourseFeedback={Boolean(courseFeedback)}
          courseHref={`/learn/${course.slug}`}
          courseId={course.id}
          courseSlug={course.slug}
        />
      ) : (
        <p className={alert.error}>
          ไม่สามารถโหลดวิดีโอได้ กรุณาแจ้งผู้ดูแลระบบ
        </p>
      )}

      {video.description && (
        <p className="max-w-2xl whitespace-pre-line text-ink-2">
          {video.description}
        </p>
      )}

      <nav className="flex items-center justify-between border-t border-line pt-4 text-sm">
        {prev ? (
          <Link
            href={`/learn/${course.slug}/${prev.id}`}
            className="text-ink-2 hover:underline"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/learn/${course.slug}/${next.id}`}
            className="font-medium hover:underline"
          >
            {next.title} →
          </Link>
        ) : (
          <Link
            href={`/learn/${course.slug}`}
            className="font-medium hover:underline"
          >
            กลับไปหน้าคอร์ส →
          </Link>
        )}
      </nav>
    </main>
  );
}
