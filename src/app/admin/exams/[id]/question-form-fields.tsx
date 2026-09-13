"use client";

import { useState } from "react";
import { input, label } from "@/components/ui";

const LETTERS = "ABCDEF";

/** Kind switcher for the "add question" form: choice inputs vs answer-key textarea. */
export function NewQuestionFields() {
  const [kind, setKind] = useState<"choice" | "text">("choice");
  return (
    <>
      <fieldset className="flex gap-4 text-sm">
        <legend className="mb-1 font-medium">ประเภทคำถาม</legend>
        <label className="flex items-center gap-2"><input type="radio" name="kind" value="choice" checked={kind === "choice"} onChange={() => setKind("choice")} /> ตัวเลือก (multiple choice)</label>
        <label className="flex items-center gap-2"><input type="radio" name="kind" value="text" checked={kind === "text"} onChange={() => setKind("text")} /> พิมพ์คำตอบ (identify)</label>
      </fieldset>

      {kind === "choice" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">ตัวเลือก (เลือกวงกลมหน้าคำตอบที่ถูก)</legend>
          {Array.from({ length: 5 }).map((_, ci) => (
            <div key={ci} className="flex items-center gap-2">
              <input type="radio" name="correct" value={ci} defaultChecked={ci === 0} aria-label={`ข้อ ${LETTERS[ci]} ถูก`} />
              <span className="w-5 text-sm text-zinc-500">{LETTERS[ci]}.</span>
              <input name="choice_body" required={ci < 2} placeholder={ci >= 2 ? "(ไม่บังคับ)" : ""} className={input} />
            </div>
          ))}
        </fieldset>
      ) : (
        <label className={label}>
          <span>เฉลย (คำตอบที่ยอมรับ 1 บรรทัดต่อ 1 คำตอบ เช่น ภาษาไทย/อังกฤษ/ตัวย่อ)</span>
          <textarea name="answer_keys" rows={4} required placeholder={"Left ventricle\nLV\nหัวใจห้องล่างซ้าย"} className={input} />
          <span className="block text-xs font-normal text-zinc-500">ระบบเทียบแบบไม่สนตัวพิมพ์เล็ก-ใหญ่และช่องว่างซ้ำ</span>
        </label>
      )}
    </>
  );
}
