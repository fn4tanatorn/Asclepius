import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { cookies } from "next/headers";
import { LineNameModal, SNOOZE_COOKIE } from "./line-name-modal";

type Role = Database["public"]["Enums"]["user_role"];

const NAV = [
  { href: "/learn", label: "บทเรียน" },
  { href: "/exam", label: "ข้อสอบ" },
];

export async function AppHeader({
  user,
  role,
  fullName,
  lineName,
}: {
  user: User;
  role: Role;
  fullName?: string | null;
  /** undefined = unknown (don't prompt); null = missing (prompt) */
  lineName?: string | null;
}) {
  const isStaff = role === "instructor" || role === "admin";
  const snoozed = lineName === null && (await cookies()).get(SNOOZE_COOKIE)?.value === "1";
  return (
    <>
    {lineName === null && !snoozed && <LineNameModal email={user.email ?? ""} />}
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex items-center gap-5">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            KawaiiMedicine
          </Link>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {n.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              จัดการ
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/profile" className="hidden text-zinc-500 hover:text-zinc-900 sm:inline dark:hover:text-zinc-100" title={user.email ?? ""}>
            {fullName || user.email}
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-zinc-500 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </header>
    </>
  );
}
