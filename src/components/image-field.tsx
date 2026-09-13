"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { input } from "@/components/ui";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads an image to the private `question-images` bucket as soon as a file is
 * picked and writes the storage path into a hidden `image_path` input, so the
 * surrounding server-action form just submits the path.
 */
export function ImageField({
  examId,
  initialPath,
  initialUrl,
}: {
  examId: string;
  initialPath?: string | null;
  initialUrl?: string | null;
}) {
  const id = useId();
  const [path, setPath] = useState(initialPath ?? "");
  const [preview, setPreview] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) return setErr("ไฟล์ใหญ่เกิน 10MB");
    setErr(null);
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const newPath = `${examId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("question-images")
      .upload(newPath, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) return setErr(`อัปโหลดไม่สำเร็จ: ${error.message}`);
    setPath(newPath);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="image_path" value={path} />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="max-h-56 rounded-lg border border-line object-contain"
        />
      )}
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          disabled={busy}
          className={`${input} file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-xs`}
        />
        {path && (
          <button
            type="button"
            onClick={() => {
              setPath("");
              setPreview("");
            }}
            className="shrink-0 text-xs text-danger hover:underline"
          >
            เอารูปออก
          </button>
        )}
      </div>
      <p className="text-xs text-ink-2">
        {busy ? (
          "กำลังอัปโหลด…"
        ) : err ? (
          <span className="text-danger">{err}</span>
        ) : (
          "jpg / png / webp / gif ไม่เกิน 10MB"
        )}
      </p>
    </div>
  );
}
