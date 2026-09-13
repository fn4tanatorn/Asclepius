import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { AppHeader } from "@/components/app-header";

const ADMIN_NAV = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/courses", label: "คอร์ส & วิดีโอ" },
  { href: "/admin/exams", label: "ข้อสอบ" },
  { href: "/admin/results", label: "ผลสอบ" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/users", label: "ผู้ใช้" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, role, fullName, lineName } = await requireStaff("/admin");
  return (
    <>
      <AppHeader user={user} role={role} fullName={fullName} lineName={lineName} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <nav className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4 text-sm dark:border-zinc-800">
          {ADMIN_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </>
  );
}
