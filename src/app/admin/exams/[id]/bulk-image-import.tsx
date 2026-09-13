"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bulkCreateTextQuestions } from "@/app/admin/actions";
import { btn, input, label } from "@/components/ui";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;
const SEPARATOR = ";";

/** "03_left ventricle; LV.jpg" → ["left ventricle", "LV"] */
export function answersFromFilename(name: string): string[] {
  const stem = name.normalize("NFC").replace(/\.[^.]+$/, "");
  const withoutIndex = stem.replace(/^\s*\d+\s*[-_.)\s]+/, "");
  return [...new Set(withoutIndex.split(SEPARATOR).map((s) => s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean))];
}

type Row = { file: File; answers: string[]; status: "pending" | "uploading" | "done" | "error"; path?: string; error?: string };

export function BulkImageImport({ examId }: { examId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [stem, setStem] = useState("โครงสร้างที่ลูกศรชี้คืออะไร");
  const [points, setPoints] = useState("1");
  const [explanation, setExplanation] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const valid = useMemo(() => rows.filter((r) => r.answers.length > 0 && r.file.size <= MAX_BYTES), [rows]);
  const done = rows.filter((r) => r.status === "done").length;
  const busy = phase === "uploading" || phase === "saving";

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setRows(files.map((file) => ({ file, answers: answersFromFilename(file.name), status: "pending" })));
    setPhase("idle");
    setMsg(null);
  }

  async function run() {
    if (valid.length === 0) return setMsg("ไม่มีไฟล์ที่นำเข้าได้");
    if (!stem.trim()) return setMsg("กรุณากรอกโจทย์");
    setMsg(null);
    setPhase("uploading");
    const supabase = createClient();
    const uploaded: { imagePath: string; answers: string[] }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.answers.length === 0 || r.file.size > MAX_BYTES) {
        setRows((rs) => rs.map((x, j) => (j === i ? { ...x, status: "error", error: r.answers.length === 0 ? "อ่านเฉลยจากชื่อไฟล์ไม่ได้" : "ไฟล์ใหญ่เกิน 10MB" } : x)));
        continue;
      }
      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, status: "uploading" } : x)));
      const ext = r.file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${examId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("question-images").upload(path, r.file, { contentType: r.file.type, upsert: false });
      if (error) {
        setRows((rs) => rs.map((x, j) => (j === i ? { ...x, status: "error", error: error.message } : x)));
        continue;
      }
      uploaded.push({ imagePath: path, answers: r.answers });
      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, status: "done", path } : x)));
    }

    if (uploaded.length === 0) {
      setPhase("error");
      return setMsg("อัปโหลดไม่สำเร็จทุกไฟล์");
    }

    setPhase("saving");
    const res = await bulkCreateTextQuestions({
      examId,
      stem,
      points: Number(points) || 1,
      explanation: explanation || null,
      items: uploaded,
    });
    if (!res.ok) {
      await supabase.storage.from("question-images").remove(uploaded.map((u) => u.imagePath));
      setPhase("error");
      return setMsg(res.error);
    }
    setPhase("done");
    setMsg(`นำเข้าแล้ว ${res.created} ข้อ${uploaded.length < rows.length ? ` (ข้าม ${rows.length - uploaded.length} ไฟล์)` : ""}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        เลือกรูปหลายไฟล์ ชื่อไฟล์คือเฉลย ทุกข้อจะใช้โจทย์และคะแนนเดียวกัน แก้รายข้อได้ทีหลัง
      </p>
      <ul className="list-inside list-disc text-xs text-zinc-500">
        <li><code>left ventricle.jpg</code> → เฉลย &quot;left ventricle&quot;</li>
        <li><code>left ventricle; LV; หัวใจห้องล่างซ้าย.png</code> → ยอมรับ 3 คำตอบ คั่นด้วย <code>;</code></li>
        <li><code>03_mitral valve.jpg</code> → ตัดเลขนำหน้าออก ใช้ <code>_</code> แทนช่องว่างได้</li>
      </ul>

      <label className={label}><span>โจทย์ (ใช้กับทุกข้อ)</span><input value={stem} onChange={(e) => setStem(e.target.value)} className={input} disabled={busy} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}><span>คะแนนต่อข้อ</span><input type="number" min={0.01} step="0.01" value={points} onChange={(e) => setPoints(e.target.value)} className={input} disabled={busy} /></label>
        <label className={label}><span>คำอธิบายเฉลย (ไม่บังคับ)</span><input value={explanation} onChange={(e) => setExplanation(e.target.value)} className={input} disabled={busy} /></label>
      </div>
      <label className={label}>
        <span>ไฟล์ภาพ (เลือกได้หลายไฟล์)</span>
        <input type="file" multiple accept={ACCEPT} onChange={onPick} disabled={busy} className={`${input} file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-800`} />
      </label>

      {rows.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
              <tr><th className="px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">ไฟล์</th><th className="px-3 py-2 font-medium">เฉลยที่อ่านได้</th><th className="px-3 py-2 font-medium">สถานะ</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((r, i) => (
                <tr key={i} className={r.answers.length === 0 || r.file.size > MAX_BYTES ? "text-red-600" : ""}>
                  <td className="px-3 py-1.5 text-zinc-500">{i + 1}</td>
                  <td className="max-w-[12rem] truncate px-3 py-1.5" title={r.file.name}>{r.file.name}</td>
                  <td className="px-3 py-1.5">{r.answers.length ? r.answers.join(" / ") : "อ่านไม่ได้"}{r.file.size > MAX_BYTES ? " · ใหญ่เกิน 10MB" : ""}</td>
                  <td className="px-3 py-1.5 text-zinc-500">
                    {r.status === "pending" ? "รอ" : r.status === "uploading" ? "กำลังอัปโหลด…" : r.status === "done" ? "✓" : <span className="text-red-600" title={r.error}>ผิดพลาด</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${rows.length ? Math.round((done / rows.length) * 100) : 0}%` }} />
        </div>
      )}
      {msg && <p className={`text-sm ${phase === "error" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>{msg}</p>}

      <button type="button" onClick={run} disabled={busy || valid.length === 0} className={btn.primary}>
        {phase === "uploading" ? `กำลังอัปโหลด ${done}/${rows.length}… (อย่าปิดหน้านี้)` : phase === "saving" ? "กำลังสร้างคำถาม…" : `นำเข้า ${valid.length} ข้อ`}
      </button>
    </div>
  );
}
