import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { alert, card, badge } from "@/components/ui";

export const metadata: Metadata = { title: "บทเรียนวิดีโอ" };

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { supabase, user } = await requireUser("/learn");
  const sp = await searchParams;
  const forbidden = sp.error === "forbidden";

  const [{ data: courses }, { data: progress }] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, slug, title, description, is_published, videos(id, is_published)",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("video_progress")
      .select("video_id, completed")
      .eq("user_id", user.id)
      .eq("completed", true),
  ]);

  const done = new Set((progress ?? []).map((p) => p.video_id));

  return (
    <main>
      <h1 className="text-2xl font-semibold">บทเรียนวิดีโอ</h1>
      {forbidden && (
        <p role="alert" className={`mt-4 ${alert.warn}`}>
          หน้าจัดการใช้ได้เฉพาะผู้สอน/ผู้ดูแลระบบเท่านั้น
        </p>
      )}

      {!courses?.length ? (
        <p className="mt-10 rounded-lg border border-dashed border-line p-8 text-center text-ink-2">
          ยังไม่มีคอร์สที่เผยแพร่
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {courses.map((c) => {
            const vids = c.videos.filter((v) => v.is_published);
            const finished = vids.filter((v) => done.has(v.id)).length;
            const pct = vids.length
              ? Math.round((finished / vids.length) * 100)
              : 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/learn/${c.slug}`}
                  className={`${card} block h-full hover:border-brand/40`}
                >
                  <h2 className="font-semibold">{c.title}</h2>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-ink-2">
                    <span>{vids.length} วิดีโอ</span>
                    {vids.length > 0 && (
                      <span className={pct === 100 ? badge.green : badge.gray}>
                        {pct === 100
                          ? "เรียนจบแล้ว"
                          : `ดูแล้ว ${finished}/${vids.length}`}
                      </span>
                    )}
                  </div>
                  {vids.length > 0 && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full bg-mint"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
