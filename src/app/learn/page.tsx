import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "บทเรียนวิดีโอ" };

export default async function LearnPage() {
  const { supabase, user } = await requireUser("/learn");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">บทเรียนวิดีโอ</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-zinc-500 underline underline-offset-4">
            ออกจากระบบ
          </button>
        </form>
      </header>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        เข้าสู่ระบบเป็น <span className="font-medium">{profile?.full_name || user.email}</span>{" "}
        ({profile?.role ?? "student"})
      </p>
      <p className="mt-10 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
        ยังไม่มีคอร์ส — จะแสดงรายการคอร์สที่นี่
      </p>
    </main>
  );
}
