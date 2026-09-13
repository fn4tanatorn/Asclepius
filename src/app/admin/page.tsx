import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";
import { badge, card } from "@/components/ui";

export const metadata: Metadata = { title: "จัดการระบบ" };

export default async function AdminHome() {
  const { supabase, role } = await requireStaff("/admin");

  const [courses, videos, exams, attempts, students, feedback, recent] =
    await Promise.all([
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("exams").select("id", { count: "exact", head: true }),
      supabase
        .from("exam_attempts")
        .select("id", { count: "exact", head: true })
        .not("submitted_at", "is", null),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("exam_feedback")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("exam_attempts")
        .select(
          "id, score, passed, submitted_at, exams(slug, title), profiles(full_name, email, line_name)",
        )
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(8),
    ]);

  const stats = [
    { label: "คอร์ส", value: courses.count ?? 0, href: "/admin/courses" },
    { label: "วิดีโอ", value: videos.count ?? 0, href: "/admin/courses" },
    { label: "ข้อสอบ", value: exams.count ?? 0, href: "/admin/exams" },
    {
      label: "ครั้งที่ส่งสอบ",
      value: attempts.count ?? 0,
      href: "/admin/results",
    },
    { label: "ผู้ใช้", value: students.count ?? 0, href: "/admin/users" },
    { label: "Feedback", value: feedback.count ?? 0, href: "/admin/feedback" },
  ];

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">ภาพรวม</h1>
        <p className="mt-1 text-sm text-ink-2">
          บทบาทของคุณ: {role === "admin" ? "ผู้ดูแลระบบ" : "ผู้สอน"}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`${card} block hover:border-brand/40`}
            >
              <p className="text-xs text-ink-2">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">ผลสอบล่าสุด</h2>
          <Link
            href="/admin/results"
            className="text-sm text-ink-2 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>
        {!recent.data?.length ? (
          <p className="mt-3 text-sm text-ink-2">ยังไม่มีการส่งข้อสอบ</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
            {recent.data.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/exam/${a.exams?.slug}/attempt/${a.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2"
                >
                  <span className="flex-1 truncate">
                    <span className="font-medium">
                      {a.profiles?.full_name ||
                        a.profiles?.email ||
                        "ไม่ทราบชื่อ"}
                    </span>
                    {a.profiles?.line_name && (
                      <span className="text-ink-2">
                        {" "}
                        (LINE: {a.profiles.line_name})
                      </span>
                    )}
                    <span className="text-ink-2"> · {a.exams?.title}</span>
                  </span>
                  <span className="text-ink-2">
                    {formatDateTime(a.submitted_at)}
                  </span>
                  <span className="w-14 text-right font-medium">
                    {formatScore(a.score)}
                  </span>
                  {a.passed != null && (
                    <span className={a.passed ? badge.green : badge.red}>
                      {a.passed ? "ผ่าน" : "ไม่ผ่าน"}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
