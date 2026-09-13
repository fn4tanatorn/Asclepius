import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const IMAGE_URL_TTL_SECONDS = 60 * 60 * 3;

/** Batch-sign private question images. Returns path → signed URL (missing on error). */
export async function signQuestionImages(
  supabase: SupabaseClient<Database>,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase.storage.from("question-images").createSignedUrls(unique, IMAGE_URL_TTL_SECONDS);
  for (const r of data ?? []) if (r.path && r.signedUrl && !r.error) map.set(r.path, r.signedUrl);
  return map;
}
