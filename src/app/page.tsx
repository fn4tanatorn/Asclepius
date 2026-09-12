import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          MedEd
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Asclepius
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          แพลตฟอร์มการเรียนแพทยศาสตร์ — วิดีโอบทเรียนและข้อสอบ
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/learn"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          บทเรียนวิดีโอ
        </Link>
        <Link
          href="/exam"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          ข้อสอบ
        </Link>
      </div>
    </main>
  );
}
