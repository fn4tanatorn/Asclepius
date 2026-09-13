"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLineName } from "@/app/profile/actions";
import { btn, input, label } from "@/components/ui";

export const SNOOZE_COOKIE = "line-name-snoozed";

/**
 * Shown after sign-in until the user has a LINE name on their profile.
 * "ไว้ทีหลัง" sets a session cookie so the server skips rendering it again this session.
 */
export function LineNameModal({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await saveLineName({ lineName: value });
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "บันทึกไม่สำเร็จ");
    setOpen(false);
    router.refresh();
  }

  function snooze() {
    document.cookie = `${SNOOZE_COOKIE}=1; path=/; SameSite=Lax`;
    setOpen(false);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="line-name-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 id="line-name-title" className="text-lg font-semibold">ชื่อของคุณใน LINE OpenChat</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            เพื่อให้ผู้สอนจับคู่บัญชี <span className="font-medium">{email}</span> กับชื่อในกลุ่ม LINE ได้ กรอกครั้งเดียว แก้ไขได้ที่หน้าโปรไฟล์
          </p>
        </div>
        <label className={label}>
          <span>ชื่อที่แสดงใน LINE</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} autoFocus required maxLength={80} placeholder="เช่น Fn.tanatorn" className={input} disabled={busy} />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex items-center justify-between">
          <button type="button" onClick={snooze} className={btn.link}>ไว้ทีหลัง</button>
          <button type="submit" disabled={busy || !value.trim()} className={btn.primary}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
        </div>
      </form>
    </div>
  );
}
