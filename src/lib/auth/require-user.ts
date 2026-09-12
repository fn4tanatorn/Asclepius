import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * For Server Components / Server Functions on protected pages.
 * The proxy already redirects anonymous users, but always re-check here:
 * the proxy is an optimistic check, not the authorization boundary.
 */
export async function requireUser(nextPath?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${q}`);
  }

  return { supabase, user };
}
