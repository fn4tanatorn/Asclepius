"use server";

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
