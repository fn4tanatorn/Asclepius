import type { Metadata } from "next";
import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { AppHeader } from "@/components/app-header";
import { Flash } from "@/components/flash";
import { EmptyState } from "@/components/empty-state";
import { badge, btn, card, input, label } from "@/components/ui";
import { formatDateTime, formatScore } from "@/lib/format";
import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "โปรไฟล์" };

export default async function ProfilePage({
  searchParams,
}: PageProps<"/profile">) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser("/profile");

  const [
    profile,
    { data: courses },
    { data: progress },
    { data: attempts },
    { data: streakRows },
  ] = await Promise.all([
    getProfile(user.id),
    supabase
      .from("courses")
      .select("id, videos(id, is_published)")
      .eq("is_published", true),
    supabase
      .from("video_progress")
      .select("video_id")
      .eq("user_id", user.id)
      .eq("completed", true),
    supabase
      .from("exam_attempts")
      .select("id, score, passed, submitted_at, exams(slug, title)")
      .eq("user_id", user.id)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
    supabase.rpc("get_my_streak"),
  ]);
  const streak = streakRows?.[0];

  const doneVideoIds = new Set((progress ?? []).map((p) => p.video_id));
  let totalVideos = 0;
  let watchedVideos = 0;
  let coursesFinished = 0;
  for (const c of courses ?? []) {
    const vids = c.videos.filter((v) => v.is_published);
    totalVideos += vids.length;
    const doneCount = vids.filter((v) => doneVideoIds.has(v.id)).length;
    watchedVideos += doneCount;
    if (vids.length > 0 && doneCount === vids.length) coursesFinished++;
  }
  const totalCourses = courses?.length ?? 0;

  const scores = (attempts ?? []).map((a) => Number(a.score ?? 0));
  const avgScore = scores.length
    ? scores.reduce((s, x) => s + x, 0) / scores.length
    : null;
  const examsPassed = (attempts ?? []).filter((a) => a.passed).length;

  return (
    <>
      <AppHeader
        user={user}
        role={profile?.role ?? "student"}
        fullName={profile?.full_name}
        lineName={profile?.line_name}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-6 py-8">
        <h1 className="text-2xl font-semibold">โปรไฟล์</h1>
        <Flash ok={sp.ok} error={sp.error} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">ผลการเรียนของฉัน</h2>
            {!!streak?.current_streak && (
              <span className={badge.amber} title="วันที่เรียนหรือทำข้อสอบต่อเนื่องกัน">
                🔥 ต่อเนื่อง {streak.current_streak} วัน
              </span>
            )}
          </div>
          <p className="text-sm text-ink-2">
            คอร์สที่เรียนจบ {coursesFinished}/{totalCourses} · วิดีโอที่ดูแล้ว{" "}
            {watchedVideos}/{totalVideos} · สอบผ่าน {examsPassed}/
            {scores.length} ครั้ง
            {avgScore != null && <> · เฉลี่ย {formatScore(avgScore)}</>}
            {!!streak?.longest_streak && (
              <> · สถิติต่อเนื่องสูงสุด {streak.longest_streak} วัน</>
            )}
          </p>

          {!attempts?.length ? (
            <EmptyState
              mood="sleepy"
              title="ยังไม่มีประวัติการสอบ"
              description="เริ่มทำข้อสอบเพื่อดูผลคะแนนของคุณที่นี่"
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-left text-xs text-ink-2">
                  <tr>
                    <th className="px-4 py-2 font-medium">ข้อสอบ</th>
                    <th className="px-4 py-2 font-medium">ส่งเมื่อ</th>
                    <th className="px-4 py-2 text-right font-medium">
                      คะแนน
                    </th>
                    <th className="px-4 py-2 font-medium">ผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-2">
                      <td className="px-4 py-2">
                        <Link
                          href={`/exam/${a.exams?.slug}/attempt/${a.id}`}
                          className="hover:underline"
                        >
                          {a.exams?.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-ink-2">
                        {formatDateTime(a.submitted_at)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatScore(a.score)}
                      </td>
                      <td className="px-4 py-2">
                        {a.passed == null ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <span className={a.passed ? badge.green : badge.red}>
                            {a.passed ? "ผ่าน" : "ไม่ผ่าน"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-lg">
          <h2 className="mb-4 text-lg font-semibold">ตั้งค่าบัญชี</h2>
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
        </section>
      </main>
    </>
  );
}
