"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswer, submitAttempt } from "@/app/exam/actions";
import { btn } from "@/components/ui";

export type RunnerQuestion = {
  id: string;
  stem: string;
  points: number;
  choices: { id: string; body: string }[];
};

type Props = {
  attemptId: string;
  questions: RunnerQuestion[];
  initialAnswers: Record<string, string>;
  deadlineMs: number | null;
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamRunner({ attemptId, questions, initialAnswers, deadlineMs }: Props) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(() => (deadlineMs ? deadlineMs - Date.now() : null));
  const [isSubmitting, startSubmit] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  // Countdown + auto-submit when the time limit expires.
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

  async function choose(questionId: string, choiceId: string) {
    const prev = answers[questionId];
    setAnswers((a) => ({ ...a, [questionId]: choiceId }));
    setPending((p) => ({ ...p, [questionId]: true }));
    setError(null);
    const res = await saveAnswer({ attemptId, questionId, choiceId });
    setPending((p) => ({ ...p, [questionId]: false }));
    if (!res.ok) {
      setAnswers((a) => {
        const next = { ...a };
        if (prev) next[questionId] = prev;
        else delete next[questionId];
        return next;
      });
      setError(
        res.reason === "expired"
          ? "หมดเวลาแล้ว ไม่สามารถบันทึกคำตอบเพิ่มได้ กรุณากดส่งข้อสอบ"
          : res.reason === "submitted"
            ? "ข้อสอบนี้ถูกส่งไปแล้ว"
            : "บันทึกคำตอบไม่สำเร็จ กรุณาลองใหม่",
      );
    }
  }

  const expired = remaining != null && remaining <= 0;
  const unanswered = questions.length - answered;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-6 py-3 text-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <span className="text-zinc-600 dark:text-zinc-400">ตอบแล้ว {answered}/{questions.length} ข้อ</span>
        {remaining != null && (
          <span className={`font-mono font-medium tabular-nums ${remaining < 60_000 ? "text-red-600" : ""}`}>
            ⏱ {fmt(remaining)}
          </span>
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
            <fieldset className="mt-4 space-y-2" disabled={expired || isSubmitting}>
              <legend className="sr-only">ตัวเลือกข้อ {i + 1}</legend>
              {q.choices.map((c, ci) => {
                const checked = answers[q.id] === c.id;
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                      checked
                        ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={c.id}
                      checked={checked}
                      onChange={() => choose(q.id, c.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="mr-2 text-zinc-500">{String.fromCharCode(0x41 + ci)}.</span>
                      {c.body}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </li>
        ))}
      </ol>

      <form
        ref={formRef}
        action={(fd) => startSubmit(() => submitAttempt(fd))}
        onSubmit={(e) => {
          if (autoSubmitted.current || expired) return;
          if (unanswered > 0 && !confirm(`ยังไม่ได้ตอบ ${unanswered} ข้อ ต้องการส่งข้อสอบเลยหรือไม่?`)) e.preventDefault();
          else if (!confirm("ยืนยันส่งข้อสอบ? ส่งแล้วแก้ไขไม่ได้")) e.preventDefault();
        }}
        className="flex items-center justify-end gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      >
        <input type="hidden" name="attemptId" value={attemptId} />
        {unanswered > 0 && <span className="text-sm text-zinc-500">เหลืออีก {unanswered} ข้อที่ยังไม่ได้ตอบ</span>}
        <button type="submit" disabled={isSubmitting} className={btn.primary}>
          {isSubmitting ? "กำลังส่ง…" : "ส่งข้อสอบ"}
        </button>
      </form>
    </div>
  );
}
