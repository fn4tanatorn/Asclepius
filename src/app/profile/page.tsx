import type { Metadata } from "next";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { AppHeader } from "@/components/app-header";
import { Flash } from "@/components/flash";
import { btn, card, input, label } from "@/components/ui";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "โปรไฟล์" };

export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const sp = await searchParams;
  const { user } = await requireUser("/profile");
  const profile = await getProfile(user.id);

  return (
    <>
      <AppHeader
        user={user}
        role={profile?.role ?? "student"}
        fullName={profile?.full_name}
        lineName={profile?.line_name}
      />
      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-6 py-8">
        <h1 className="text-2xl font-semibold">โปรไฟล์</h1>
        <Flash ok={sp.ok} error={sp.error} />
        <form action={updateProfile} className={`${card} space-y-4`}>
          <div className="text-sm">
            <p className="text-ink-2">อีเมล (จาก Google)</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <label className={label}>
            <span>ชื่อ-นามสกุล</span>
            <input
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
              required
              className={input}
            />
          </label>
          <label className={label}>
            <span>ชื่อใน LINE OpenChat</span>
            <input
              name="line_name"
              defaultValue={profile?.line_name ?? ""}
              required
              placeholder="ชื่อที่แสดงในกลุ่ม LINE"
              className={input}
            />
            <span className="block text-xs font-normal text-ink-2">
              ใช้ให้ผู้สอนจับคู่บัญชีของคุณกับชื่อในกลุ่ม LINE
            </span>
          </label>
          <button type="submit" className={btn.primary}>
            บันทึก
          </button>
        </form>
      </main>
    </>
  );
}
