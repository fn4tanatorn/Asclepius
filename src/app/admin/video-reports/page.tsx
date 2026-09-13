import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime } from "@/lib/format";
import { badge, card, input } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { toggleReportResolved } from "../actions";

export const metadata: Metadata = { title: "ปัญหาวิดีโอ" };

export default async function AdminVideoReportsPage({
  searchParams,
}: PageProps<"/admin/video-reports">) {
  const sp = await searchParams;
  const show =
    sp.show === "all" ? "all" : sp.show === "resolved" ? "resolved" : "open";
  const { supabase } = await requireStaff("/admin/video-reports");

  let q = supabase
    .from("video_issue_reports")
    .select(
      "id, message, resolved, created_at, videos(id, title, courses(id, slug, title)), profiles(full_name, email, line_name)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (show === "open") q = q.eq("resolved", false);
  if (show === "resolved") q = q.eq("resolved", true);

  const { data: rows } = await q;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ปัญหาวิดีโอ</h1>
          <p className="mt-1 text-sm text-ink-2">
            รายงานที่ผู้เรียนแจ้งระหว่างดูวิดีโอ กดทำเครื่องหมายเมื่อแก้ไขแล้ว
          </p>
        </div>
        <form method="get" className="flex items-center gap-2 text-sm">
          <select name="show" defaultValue={show} className={input}>
            <option value="open">ยังไม่แก้ไข</option>
            <option value="resolved">แก้ไขแล้ว</option>
            <option value="all">ทั้งหมด</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-line px-3 py-2 hover:bg-surface-2"
          >
            กรอง
          </button>
        </form>
      </div>

      {!rows?.length ? (
        <EmptyState
          mood="sleepy"
          title={show === "open" ? "ไม่มีปัญหาค้างอยู่" : "ยังไม่มีรายงาน"}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`${card} ${r.resolved ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {r.profiles?.full_name ||
                        r.profiles?.email ||
                        "ไม่ทราบชื่อ"}
                    </span>
                    <span className="text-ink-2">
                      {" "}
                      · {formatDateTime(r.created_at)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {r.videos?.courses && (
                      <Link
                        href={`/admin/courses/${r.videos.courses.id}`}
                        className="hover:underline"
                      >
                        {r.videos.courses.title}
                      </Link>
                    )}
                    {r.videos && <> · {r.videos.title}</>}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">
                    {r.message}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={r.resolved ? badge.green : badge.amber}>
                    {r.resolved ? "แก้ไขแล้ว" : "ยังไม่แก้ไข"}
                  </span>
                  <form action={toggleReportResolved}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      type="hidden"
                      name="resolved"
                      value={String(r.resolved)}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface-2"
                    >
                      {r.resolved
                        ? "ทำเป็นยังไม่แก้ไข"
                        : "ทำเครื่องหมายว่าแก้ไขแล้ว"}
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
