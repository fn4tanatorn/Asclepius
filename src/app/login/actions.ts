"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl, safeNextPath } from "@/lib/auth/site-url";

function loginUrl(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return `/login?${q}`;
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next")?.toString());
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    redirect(loginUrl({ error: "google", next }));
  }
  redirect(data.url);
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const next = safeNextPath(formData.get("next")?.toString());

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(loginUrl({ error: "email", next }));
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(loginUrl({ error: "magic", next }));
  }
  redirect(loginUrl({ sent: email, next }));
}
