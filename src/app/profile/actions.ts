"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";

const clean = (v: FormDataEntryValue | null, max: number) =>
  (v?.toString() ?? "").normalize("NFC").trim().replace(/\s+/g, " ").slice(0, max);

/** Called from the post-login modal. Returns instead of redirecting so the modal can close itself. */
export async function saveLineName(input: { lineName: string }): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const lineName = clean(input.lineName, 80);
  if (!lineName) return { ok: false, error: "กรุณากรอกชื่อ LINE" };
  const { error } = await supabase.from("profiles").update({ line_name: lineName }).eq("id", user.id);
  if (error) return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Profile page form. */
export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser("/profile");
  const fullName = clean(formData.get("full_name"), 120);
  const lineName = clean(formData.get("line_name"), 80);
  if (!fullName) redirect("/profile?error=" + encodeURIComponent("กรุณากรอกชื่อ"));
  if (!lineName) redirect("/profile?error=" + encodeURIComponent("กรุณากรอกชื่อ LINE"));
  const { error } = await supabase.from("profiles").update({ full_name: fullName, line_name: lineName }).eq("id", user.id);
  if (error) redirect("/profile?error=" + encodeURIComponent("บันทึกไม่สำเร็จ"));
  revalidatePath("/", "layout");
  redirect("/profile?ok=" + encodeURIComponent("บันทึกแล้ว"));
}
