import Link from "next/link";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LineNameModal, SNOOZE_COOKIE } from "./line-name-modal";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { IconExam, IconPlay, IconSettings, Logo } from "./icons";

type Role = Database["public"]["Enums"]["user_role"];

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
  const snoozed =
    lineName === null && (await cookies()).get(SNOOZE_COOKIE)?.value === "1";
  const display = fullName || user.email || "";
  const initial = (fullName || user.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const items = [
    {
      href: "/learn",
      label: "บทเรียน",
      icon: <IconPlay width={18} height={18} />,
    },
    {
      href: "/exam",
      label: "ข้อสอบ",
      icon: <IconExam width={18} height={18} />,
    },
    ...(isStaff
      ? [
          {
            href: "/admin",
            label: "จัดการ",
            icon: <IconSettings width={18} height={18} />,
          },
        ]
      : []),
  ];

  return (
    <>
      {lineName === null && !snoozed && (
        <LineNameModal email={user.email ?? ""} />
      )}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-pill border border-line bg-surface/85 px-3 py-2 shadow-soft backdrop-blur sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 pl-1 text-base font-bold tracking-tight"
            >
              <Logo className="text-brand" />
              <span className="hidden sm:inline">
                <span className="text-pink">Kawaii</span>
                <span className="text-ink">Medicine</span>
              </span>
            </Link>
            <NavLinks items={items} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <span className="hidden h-5 w-px bg-line sm:block" />
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-pill py-1 pl-1 pr-3 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
              title={user.email ?? ""}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-soft text-sm font-bold text-pink">
                {initial}
              </span>
              <span className="hidden max-w-[10rem] truncate font-medium sm:inline">
                {display}
              </span>
            </Link>
            <span className="hidden h-5 w-px bg-line sm:block" />
            <form action="/auth/signout" method="post">
              <button className="rounded-pill px-3 py-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink">
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
