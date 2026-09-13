"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Catches errors thrown from the root layout itself, which error.tsx can't
 * reach. Must define its own html/body since it replaces the whole layout.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="th" className={`${notoThai.variable} h-full`}>
      <body className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">เกิดข้อผิดพลาดร้ายแรง</h1>
        <p className="text-ink-2">กรุณาลองรีเฟรชหน้านี้อีกครั้ง</p>
      </body>
    </html>
  );
}
