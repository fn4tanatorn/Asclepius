"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { attemptsLeft, deadlineOf, examAvailability } from "@/lib/exam-status";

const GRACE_MS = 30_000;

async function loadOwnAttempt(attemptId: string) {
  const { supabase, user } = await requireUser();
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, user_id, started_at, submitted_at, exams(slug, time_limit_minutes, closes_at)")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt) throw new Error("attempt not found");
  return { supabase, user, attempt };
}

/** Start a new attempt on a published exam (or resume an open one). */
export async function startAttempt(formData: FormData) {
  const slug = formData.get("slug")?.toString() ?? "";
  const { supabase, user } = await requireUser(`/exam/${slug}`);

  const { data: exam } = await supabase
    .from("exams")
    .select("id, slug, is_published, opens_at, closes_at, max_attempts")
    .eq("slug", slug)
    .maybeSingle();
  if (!exam || !exam.is_published) redirect("/exam");
  if (examAvailability(exam).state !== "open") redirect(`/exam/${exam.slug}?error=closed`);

  const { data: open } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", exam.id)
    .eq("user_id", user.id)
    .is("submitted_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) redirect(`/exam/${exam.slug}/attempt/${open.id}`);

  const { count } = await supabase
    .from("exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", exam.id)
    .eq("user_id", user.id);
  if (!attemptsLeft(exam.max_attempts, count ?? 0)) redirect(`/exam/${exam.slug}?error=limit`);

  const { data: created, error } = await supabase
    .from("exam_attempts")
    .insert({ exam_id: exam.id, user_id: user.id })
    .select("id")
    .single();
  if (error || !created) redirect(`/exam/${exam.slug}?error=start`);

  redirect(`/exam/${exam.slug}/attempt/${created.id}`);
}

/** Save (upsert) one answer (a choice or a typed answer). Rejected after submission or past the time limit. */
export async function saveAnswer(
  input: { attemptId: string; questionId: string } & ({ choiceId: string } | { textAnswer: string }),
) {
  const { supabase, attempt } = await loadOwnAttempt(input.attemptId);
  if (attempt.submitted_at) return { ok: false, reason: "submitted" as const };

  const deadline = deadlineOf(attempt.started_at, attempt.exams?.time_limit_minutes ?? null, attempt.exams?.closes_at ?? null);
  if (deadline && Date.now() > deadline + GRACE_MS) return { ok: false, reason: "expired" as const };

  const row =
    "choiceId" in input
      ? { choice_id: input.choiceId, text_answer: null }
      : { choice_id: null, text_answer: input.textAnswer.slice(0, 500) };

  const { error } = await supabase.from("attempt_answers").upsert(
    { attempt_id: attempt.id, question_id: input.questionId, ...row, answered_at: new Date().toISOString() },
    { onConflict: "attempt_id,question_id" },
  );
  return { ok: !error, reason: error ? ("error" as const) : undefined };
}

/** Grade via the submit_exam_attempt RPC, then go to the result page. */
export async function submitAttempt(formData: FormData) {
  const attemptId = formData.get("attemptId")?.toString() ?? "";
  const { supabase, attempt } = await loadOwnAttempt(attemptId);
  const slug = attempt.exams?.slug ?? "";

  if (!attempt.submitted_at) {
    const { error } = await supabase.rpc("submit_exam_attempt", { p_attempt_id: attempt.id });
    if (error) redirect(`/exam/${slug}/attempt/${attempt.id}?error=submit`);
  }
  redirect(`/exam/${slug}/attempt/${attempt.id}`);
}
