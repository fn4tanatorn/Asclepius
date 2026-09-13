import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/site-url";
import { sendMagicLink, signInWithGoogle } from "./actions";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

const ERRORS: Record<string, string> = {
  google: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่",
  email: "กรุณากรอกอีเมลให้ถูกต้อง",
  magic: "ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่ในอีกสักครู่",
  callback: "ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : undefined);
  const sent = typeof sp.sent === "string" ? sp.sent : null;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            KawaiiMedicine
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {sent ? (
          <div className="space-y-3 rounded-lg border border-zinc-200 p-5 text-center dark:border-zinc-800">
            <p className="font-medium">ส่งลิงก์เข้าสู่ระบบแล้ว</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ตรวจสอบกล่องจดหมายของ <span className="font-medium">{sent}</span>{" "}
              แล้วกดลิงก์ในอีเมลเพื่อเข้าสู่ระบบ (ลิงก์มีอายุจำกัด)
            </p>
            <a
              href={`/login?next=${encodeURIComponent(next)}`}
              className="inline-block text-sm text-zinc-500 underline underline-offset-4"
            >
              ใช้อีเมลอื่น
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <GoogleIcon />
                เข้าสู่ระบบด้วย Google
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              หรือ
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <form action={sendMagicLink} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">อีเมล</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                ส่งลิงก์เข้าสู่ระบบทางอีเมล
              </button>
              <p className="text-center text-xs text-zinc-500">
                ไม่ต้องตั้งรหัสผ่าน — เรากดลิงก์ในอีเมลเพื่อเข้าสู่ระบบ
              </p>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
