"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { btn } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาด</h1>
      <p className="text-ink-2">
        กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ
      </p>
      <button onClick={reset} className={btn.secondary}>
        ลองใหม่
      </button>
    </main>
  );
}
