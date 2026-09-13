import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * One Supabase client + one getUser() per request, shared by layout and page
 * (React cache() dedupes within a single server render).
 */
const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/** Profile row for the signed-in user, fetched at most once per request. */
export const getProfile = cache(async (userId: string) => {
  const { supabase } = await getSession();
  const { data } = await supabase
    .from("profiles")
    .select("role, full_name, line_name")
    .eq("id", userId)
    .single();
  return data;
});

/**
 * For Server Components / Server Functions on protected pages.
 * The proxy already redirects anonymous users, but always re-check here:
 * the proxy is an optimistic check, not the authorization boundary.
 */
export async function requireUser(nextPath?: string) {
  const { supabase, user } = await getSession();
  if (!user) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${q}`);
  }
  return { supabase, user };
}

/**
 * Same as requireUser, but also requires role instructor or admin.
 * Non-staff users are sent back to /learn. RLS still enforces every
 * query; this is the UI-level gate.
 */
export async function requireStaff(nextPath?: string) {
  const { supabase, user } = await requireUser(nextPath);
  const profile = await getProfile(user.id);
  const role = profile?.role ?? "student";
  if (role !== "instructor" && role !== "admin") {
    redirect("/learn?error=forbidden");
  }
  return {
    supabase,
    user,
    role,
    fullName: profile?.full_name ?? "",
    lineName: profile?.line_name ?? null,
  };
}
