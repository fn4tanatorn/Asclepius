import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { badge, btn, card, input, label } from "@/components/ui";
import { Flash } from "@/components/flash";
import { EmptyState } from "@/components/empty-state";
import { createCourse } from "../actions";

export const metadata: Metadata = { title: "จัดการคอร์ส" };

export default async function AdminCoursesPage({
  searchParams,
}: PageProps<"/admin/courses">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff("/admin/courses");
  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, slug, title, is_published, updated_at, videos(id, is_published)",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">คอร์ส & วิดีโอ</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          {!courses?.length ? (
            <EmptyState
              title="ยังไม่มีคอร์ส"
              description="สร้างคอร์สแรกจากฟอร์มด้านข้าง"
            />
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {courses.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/courses/${c.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2"
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{c.title}</span>
                      <span className="block text-xs text-ink-2">
                        /learn/{c.slug} ·{" "}
                        {c.videos.filter((v) => v.is_published).length}/
                        {c.videos.length} วิดีโอเผยแพร่
                      </span>
                    </span>
                    <span className={c.is_published ? badge.green : badge.gray}>
                      {c.is_published ? "เผยแพร่" : "ฉบับร่าง"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className={card}>
          <h2 className="font-semibold">สร้างคอร์สใหม่</h2>
          <form action={createCourse} className="mt-4 space-y-3">
            <label className={label}>
              <span>ชื่อคอร์ส</span>
              <input name="title" required className={input} />
            </label>
            <label className={label}>
              <span>slug (ไม่บังคับ)</span>
              <input
                name="slug"
                placeholder="เช่น anatomy-101"
                className={input}
              />
            </label>
            <label className={label}>
              <span>คำอธิบาย</span>
              <textarea name="description" rows={3} className={input} />
            </label>
            <button type="submit" className={`${btn.primary} w-full`}>
              สร้างคอร์ส
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
