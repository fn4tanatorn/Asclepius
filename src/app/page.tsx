import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { btn } from "@/components/ui";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <ThemeToggle className="absolute top-4 right-4 border border-line bg-surface/80 shadow-soft backdrop-blur" />
      <div className="space-y-4">
        <Logo className="mx-auto text-brand" />
        <p className="text-sm font-semibold uppercase tracking-widest text-pink">
          MedEd
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          <span className="text-pink">Kawaii</span>
          <span className="text-ink">Medicine</span>
        </h1>
        <p className="max-w-md text-ink-2">
          แพลตฟอร์มการเรียนแพทยศาสตร์ — วิดีโอบทเรียนและข้อสอบ
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/learn" className={btn.primary}>
          บทเรียนวิดีโอ
        </Link>
        <Link href="/exam" className={btn.secondary}>
          ข้อสอบ
        </Link>
      </div>
      {!user && (
        <Link href="/login" className={btn.link}>
          เข้าสู่ระบบ
        </Link>
      )}
    </main>
  );
}
