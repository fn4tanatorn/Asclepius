import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { alert, badge, btn, card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PageTitle } from "@/components/page-title";
import { TopicIcon } from "@/components/topic-icon";

export const metadata: Metadata = { title: "บทเรียนวิดีโอ" };

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { supabase, user } = await requireUser("/learn");
  const sp = await searchParams;
  const forbidden = sp.error === "forbidden";

  const [{ data: courses }, { data: progress }, profile] = await Promise.all([
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
    getProfile(user.id),
  ]);

  const done = new Set((progress ?? []).map((p) => p.video_id));
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";

  return (
    <main>
      <PageTitle
        icon={
          <Image
            src="/icons/books.png"
            alt=""
            width={40}
            height={40}
            className="object-contain"
          />
        }
        tint="brand"
        title="บทเรียนวิดีโอ"
        subtitle="เรียนรู้ได้ทุกที่ ทุกเวลา เสริมสร้างความรู้ทางการแพทย์"
      />
      {forbidden && (
        <p role="alert" className={`mt-4 ${alert.warn}`}>
          หน้าจัดการใช้ได้เฉพาะผู้สอน/ผู้ดูแลระบบเท่านั้น
        </p>
      )}

      {!courses?.length ? (
        <div className="mt-8">
          <EmptyState
            title="ยังไม่มีคอร์สที่เผยแพร่"
            description={
              isStaff
                ? "เริ่มสร้างคอร์สวิดีโอเพื่อแบ่งปันความรู้ให้กับผู้เรียนกันเลย!"
                : "รอผู้สอนเพิ่มคอร์สเข้ามา แล้วกลับมาดูใหม่อีกครั้งนะ"
            }
            action={
              isStaff && (
                <Link href="/admin/courses" className={btn.primary}>
                  + เพิ่มคอร์สแรก
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {courses.map((c, i) => {
            const vids = c.videos.filter((v) => v.is_published);
            const finished = vids.filter((v) => done.has(v.id)).length;
            const pct = vids.length
              ? Math.round((finished / vids.length) * 100)
              : 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/learn/${c.slug}`}
                  className={`${card} flex h-full gap-4 hover:border-brand/40`}
                >
                  <TopicIcon index={i} title={c.title} size={48} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{c.title}</h2>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-ink-2">
                      <span>{vids.length} วิดีโอ</span>
                      {vids.length > 0 && (
                        <span
                          className={pct === 100 ? badge.green : badge.gray}
                        >
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
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
