"use client";

import { btn } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="text-zinc-600 dark:text-zinc-400">กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ</p>
      <button onClick={reset} className={btn.secondary}>ลองใหม่</button>
    </main>
  );
}
