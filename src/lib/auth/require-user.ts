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

/**
 * Same as requireUser, but also requires role instructor or admin.
 * Non-staff users are sent back to /learn. RLS still enforces every
 * query; this is the UI-level gate.
 */
export async function requireStaff(nextPath?: string) {
  const { supabase, user } = await requireUser(nextPath);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "student";
  if (role !== "instructor" && role !== "admin") {
    redirect("/learn?error=forbidden");
  }

  return { supabase, user, role, fullName: profile?.full_name ?? "" };
}
