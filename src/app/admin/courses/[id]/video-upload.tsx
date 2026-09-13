"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerUploadedVideo } from "@/app/admin/actions";
import { btn, input, label } from "@/components/ui";

const ACCEPT = "video/mp4,video/webm,video/quicktime";

/** Uploads straight from the browser to the private `videos` bucket, then registers the row. */
export function VideoUpload({ courseId }: { courseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function readDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(v.src);
        resolve(Number.isFinite(v.duration) ? v.duration : null);
      };
      v.onerror = () => resolve(null);
      v.src = URL.createObjectURL(file);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setMsg("กรุณาเลือกไฟล์วิดีโอ");
    if (!title.trim()) return setMsg("กรุณากรอกชื่อวิดีโอ");

    setMsg(null);
    setStatus("uploading");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const path = `${courseId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("videos")
      .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
    if (error) {
      setStatus("error");
      setMsg(`อัปโหลดไม่สำเร็จ: ${error.message}`);
      return;
    }

    setStatus("saving");
    const duration = await readDuration(file);
    const res = await registerUploadedVideo({ courseId, title: title.trim(), storagePath: path, durationSeconds: duration });
    if (!res.ok) {
      setStatus("error");
      setMsg("บันทึกข้อมูลวิดีโอไม่สำเร็จ (ไฟล์อัปโหลดแล้ว) กรุณาแจ้งผู้ดูแล");
      return;
    }
    setStatus("idle");
    setTitle("");
    if (fileRef.current) fileRef.current.value = "";
    setMsg("เพิ่มวิดีโอแล้ว (ฉบับร่าง)");
    router.refresh();
  }

  const busy = status === "uploading" || status === "saving";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className={label}>
        <span>ชื่อวิดีโอ</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className={input} disabled={busy} />
      </label>
      <label className={label}>
        <span>ไฟล์วิดีโอ (mp4 / webm / mov)</span>
        <input ref={fileRef} type="file" accept={ACCEPT} required className={`${input} file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-800`} disabled={busy} />
      </label>
      {msg && <p className={`text-sm ${status === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>{msg}</p>}
      <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
        {status === "uploading" ? "กำลังอัปโหลด… (อย่าปิดหน้านี้)" : status === "saving" ? "กำลังบันทึก…" : "อัปโหลดและเพิ่มวิดีโอ"}
      </button>
      <p className="text-xs text-zinc-500">วิดีโอที่อัปโหลดจะเป็นฉบับร่าง ต้องกดเผยแพร่ในรายการด้านซ้าย</p>
    </form>
  );
}
