"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswer, submitAttempt } from "@/app/exam/actions";
import { btn, input } from "@/components/ui";

export type RunnerQuestion = {
  id: string;
  kind: "choice" | "text";
  stem: string;
  points: number;
  imageUrl: string | null;
  choices: { id: string; body: string }[];
};

type Props = {
  attemptId: string;
  questions: RunnerQuestion[];
  initialAnswers: Record<string, string>; // questionId → choiceId or typed text
  deadlineMs: number | null;
};

const TEXT_DEBOUNCE_MS = 800;

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamRunner({ attemptId, questions, initialAnswers, deadlineMs }: Props) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [saved, setSaved] = useState(initialAnswers); // last value confirmed by the server
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(() => (deadlineMs ? deadlineMs - Date.now() : null));
  const [isSubmitting, startSubmit] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const answered = useMemo(() => Object.values(answers).filter((v) => v.trim() !== "").length, [answers]);

  useEffect(() => {
    if (!deadlineMs) return;
    const t = setInterval(() => {
      const left = deadlineMs - Date.now();
      setRemaining(left);
      if (left <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        clearInterval(t);
        formRef.current?.requestSubmit();
      }
    }, 500);
    return () => clearInterval(t);
  }, [deadlineMs]);

  function failMessage(reason?: string) {
    return reason === "expired"
      ? "หมดเวลาแล้ว ไม่สามารถบันทึกคำตอบเพิ่มได้ กรุณากดส่งข้อสอบ"
      : reason === "submitted"
        ? "ข้อสอบนี้ถูกส่งไปแล้ว"
        : "บันทึกคำตอบไม่สำเร็จ กรุณาลองใหม่";
  }

  async function chooseChoice(questionId: string, choiceId: string) {
    const prev = saved[questionId];
    setAnswers((a) => ({ ...a, [questionId]: choiceId }));
    setPending((p) => ({ ...p, [questionId]: true }));
    setError(null);
    const res = await saveAnswer({ attemptId, questionId, choiceId });
    setPending((p) => ({ ...p, [questionId]: false }));
    if (res.ok) setSaved((s) => ({ ...s, [questionId]: choiceId }));
    else {
      setAnswers((a) => {
        const next = { ...a };
        if (prev) next[questionId] = prev;
        else delete next[questionId];
        return next;
      });
      setError(failMessage(res.reason));
    }
  }

  async function persistText(questionId: string, text: string) {
    setPending((p) => ({ ...p, [questionId]: true }));
    const res = await saveAnswer({ attemptId, questionId, textAnswer: text });
    setPending((p) => ({ ...p, [questionId]: false }));
    if (res.ok) setSaved((s) => ({ ...s, [questionId]: text }));
    else setError(failMessage(res.reason));
  }

  function onText(questionId: string, text: string) {
    setAnswers((a) => ({ ...a, [questionId]: text }));
    setError(null);
    clearTimeout(timers.current[questionId]);
    timers.current[questionId] = setTimeout(() => void persistText(questionId, text), TEXT_DEBOUNCE_MS);
  }

  function flushText(questionId: string) {
    clearTimeout(timers.current[questionId]);
    const text = answers[questionId] ?? "";
    if (text !== (saved[questionId] ?? "")) void persistText(questionId, text);
  }

  const expired = remaining != null && remaining <= 0;
  const unanswered = questions.length - answered;
  const unsaved = questions.some((q) => q.kind === "text" && (answers[q.id] ?? "") !== (saved[q.id] ?? ""));

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-6 py-3 text-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <span className="text-zinc-600 dark:text-zinc-400">ตอบแล้ว {answered}/{questions.length} ข้อ</span>
        {remaining != null && (
          <span className={`font-mono font-medium tabular-nums ${remaining < 60_000 ? "text-red-600" : ""}`}>⏱ {fmt(remaining)}</span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>
      )}

      <ol className="space-y-6">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-4">
              <p className="font-medium">
                <span className="mr-2 text-zinc-500">{i + 1}.</span>
                <span className="whitespace-pre-line">{q.stem}</span>
              </p>
              <span className="shrink-0 text-xs text-zinc-500">{q.points} คะแนน{pending[q.id] ? " · บันทึก…" : ""}</span>
            </div>

            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt={`ภาพประกอบข้อ ${i + 1}`} className="mt-4 max-h-[28rem] w-auto max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" />
            )}

            {q.kind === "choice" ? (
              <fieldset className="mt-4 space-y-2" disabled={expired || isSubmitting}>
                <legend className="sr-only">ตัวเลือกข้อ {i + 1}</legend>
                {q.choices.map((c, ci) => {
                  const checked = answers[q.id] === c.id;
                  return (
                    <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm ${checked ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900" : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"}`}>
                      <input type="radio" name={`q-${q.id}`} value={c.id} checked={checked} onChange={() => chooseChoice(q.id, c.id)} className="mt-1" />
                      <span><span className="mr-2 text-zinc-500">{String.fromCharCode(0x41 + ci)}.</span>{c.body}</span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <label className="mt-4 block space-y-1.5 text-sm">
                <span className="font-medium">คำตอบ</span>
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => onText(q.id, e.target.value)}
                  onBlur={() => flushText(q.id)}
                  disabled={expired || isSubmitting}
                  maxLength={500}
                  autoComplete="off"
                  placeholder="พิมพ์ชื่อโครงสร้าง / คำตอบ"
                  className={input}
                />
              </label>
            )}
          </li>
        ))}
      </ol>

      <form
        ref={formRef}
        action={(fd) => startSubmit(() => submitAttempt(fd))}
        onSubmit={(e) => {
          questions.forEach((q) => q.kind === "text" && flushText(q.id));
          if (autoSubmitted.current || expired) return;
          if (unanswered > 0 && !confirm(`ยังไม่ได้ตอบ ${unanswered} ข้อ ต้องการส่งข้อสอบเลยหรือไม่?`)) e.preventDefault();
          else if (!confirm("ยืนยันส่งข้อสอบ? ส่งแล้วแก้ไขไม่ได้")) e.preventDefault();
        }}
        className="flex items-center justify-end gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <input type="hidden" name="attemptId" value={attemptId} />
        {unanswered > 0 && <span className="text-sm text-zinc-500">เหลืออีก {unanswered} ข้อที่ยังไม่ได้ตอบ</span>}
        <button type="submit" disabled={isSubmitting || unsaved} className={btn.primary}>
          {isSubmitting ? "กำลังส่ง…" : unsaved ? "กำลังบันทึก…" : "ส่งข้อสอบ"}
        </button>
      </form>
    </div>
  );
}
