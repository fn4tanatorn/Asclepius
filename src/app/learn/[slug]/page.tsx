import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { formatDuration } from "@/lib/format";
import { badge } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await requireUser(`/learn/${slug}`);
  const { data } = await supabase.from("courses").select("title").eq("slug", slug).maybeSingle();
  return { title: data?.title ?? "คอร์ส" };
}

export default async function CoursePage({ params }: PageProps<"/learn/[slug]">) {
  const { slug } = await params;
  const { supabase, user } = await requireUser(`/learn/${slug}`);

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, description, is_published, videos(id, title, duration_seconds, position, is_published)")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) notFound();

  const videos = course.videos
    .filter((v) => v.is_published)
    .sort((a, b) => a.position - b.position);

  const { data: progress } = await supabase
    .from("video_progress")
    .select("video_id, seconds_watched, completed")
    .eq("user_id", user.id)
    .in("video_id", videos.map((v) => v.id));
  const byVideo = new Map((progress ?? []).map((p) => [p.video_id, p]));

  return (
    <main>
      <Link href="/learn" className="text-sm text-zinc-500 hover:underline">← คอร์สทั้งหมด</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        {!course.is_published && <span className={badge.amber}>ยังไม่เผยแพร่ (เห็นเฉพาะเจ้าหน้าที่)</span>}
      </div>
      {course.description && (
        <p className="mt-2 max-w-2xl whitespace-pre-line text-zinc-600 dark:text-zinc-400">{course.description}</p>
      )}

      {videos.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          ยังไม่มีวิดีโอในคอร์สนี้
        </p>
      ) : (
        <ol className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {videos.map((v, i) => {
            const p = byVideo.get(v.id);
            return (
              <li key={v.id}>
                <Link
                  href={`/learn/${course.slug}/${v.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                      p?.completed
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                    aria-label={p?.completed ? "ดูจบแล้ว" : undefined}
                  >
                    {p?.completed ? "✓" : i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{v.title}</span>
                    {p && !p.completed && p.seconds_watched > 0 && (
                      <span className="block text-xs text-zinc-500">ดูค้างไว้ที่ {formatDuration(p.seconds_watched)}</span>
                    )}
                  </span>
                  <span className="text-sm text-zinc-500">{formatDuration(v.duration_seconds)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
