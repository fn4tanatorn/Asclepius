"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";

/**
 * Upsert the caller's progress for a video. Called from the player
 * (throttled) and on pause/ended. RLS restricts rows to the caller.
 */
export async function saveVideoProgress(input: {
  videoId: string;
  secondsWatched: number;
  completed: boolean;
}) {
  const { supabase, user } = await requireUser();
  const seconds = Math.max(0, Math.floor(Number(input.secondsWatched) || 0));

  // Never un-complete a video from the player.
  const { data: existing } = await supabase
    .from("video_progress")
    .select("completed, seconds_watched")
    .eq("user_id", user.id)
    .eq("video_id", input.videoId)
    .maybeSingle();

  const { error } = await supabase.from("video_progress").upsert(
    {
      user_id: user.id,
      video_id: input.videoId,
      seconds_watched: seconds,
      completed: Boolean(input.completed) || Boolean(existing?.completed),
    },
    { onConflict: "user_id,video_id" },
  );

  return { ok: !error };
}

const cleanText = (v: FormDataEntryValue | null, max: number) => {
  const t = (v?.toString() ?? "").normalize("NFC").trim();
  return t ? t.slice(0, max) : null;
};

/**
 * Post-course feedback, once per (course, student) — RLS only allows the
 * insert once every published video in the course is completed. Empty
 * form = skip, same as exam feedback.
 */
export async function submitCourseFeedback(formData: FormData) {
  const courseId = formData.get("courseId")?.toString() ?? "";
  const slug = formData.get("slug")?.toString() ?? "";
  const { supabase, user } = await requireUser();
  const coursePath = `/learn/${slug}`;

  const courseComment = cleanText(formData.get("course_comment"), 2000);
  const generalComment = cleanText(formData.get("general_comment"), 2000);
  if (!courseComment && !generalComment) redirect(coursePath);

  const { error } = await supabase.from("course_feedback").insert({
    course_id: courseId,
    user_id: user.id,
    course_comment: courseComment,
    general_comment: generalComment,
  });
  if (error && error.code !== "23505") {
    redirect(`${coursePath}/feedback?error=1`);
  }
  revalidatePath(coursePath);
  redirect(`${coursePath}?feedback=thanks`);
}

/**
 * Lightweight "something's wrong with this video" report — available any
 * time while watching, not gated on finishing anything. No page navigation;
 * the player shows a small inline confirmation.
 */
export async function reportVideoIssue(input: {
  videoId: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const message = input.message.normalize("NFC").trim().slice(0, 1000);
  if (!message) return { ok: false, error: "กรุณากรอกรายละเอียดปัญหา" };

  const { error } = await supabase.from("video_issue_reports").insert({
    video_id: input.videoId,
    user_id: user.id,
    message,
  });
  return { ok: !error, error: error ? "ส่งไม่สำเร็จ กรุณาลองใหม่" : undefined };
}
