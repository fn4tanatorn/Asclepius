import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProfile, requireUser } from "@/lib/auth/require-user";
import { formatScore } from "@/lib/format";
import { badge, btn, card } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { PageTitle } from "@/components/page-title";
import { TopicIcon } from "@/components/topic-icon";
import { examAvailability } from "@/lib/exam-status";

export const metadata: Metadata = { title: "ข้อสอบ" };

export default async function ExamListPage() {
  const { supabase, user } = await requireUser("/exam");

  const [{ data: exams }, { data: attempts }, profile] = await Promise.all([
    supabase
      .from("exams")
      .select(
        "id, slug, title, description, time_limit_minutes, passing_score, is_published, opens_at, closes_at, max_attempts, questions(id), courses(title)",
      )
      .eq("is_published", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("exam_attempts")
      .select("id, exam_id, submitted_at, score, passed, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
    getProfile(user.id),
  ]);

  const latestByExam = new Map<string, NonNullable<typeof attempts>[number]>();
  const openByExam = new Map<string, string>();
  const usedByExam = new Map<string, number>();
  for (const a of attempts ?? []) {
    usedByExam.set(a.exam_id, (usedByExam.get(a.exam_id) ?? 0) + 1);
    if (!a.submitted_at && !openByExam.has(a.exam_id))
      openByExam.set(a.exam_id, a.id);
    if (a.submitted_at && !latestByExam.has(a.exam_id))
      latestByExam.set(a.exam_id, a);
  }
  const isStaff = profile?.role === "instructor" || profile?.role === "admin";

  return (
    <main>
      <PageTitle
        icon={
          <Image
            src="/icons/clipboard.png"
            alt=""
            width={40}
            height={40}
            className="object-contain"
          />
        }
        tint="pink"
        title="ข้อสอบ"
        subtitle="ฝึกทำข้อสอบ เพิ่มความมั่นใจก่อนสอบจริง"
      />
      {!exams?.length ? (
        <div className="mt-8">
          <EmptyState
            title="ยังไม่มีข้อสอบที่เผยแพร่"
            description={
              isStaff
                ? "สร้างข้อสอบชุดแรกเพื่อให้ผู้เรียนได้ฝึกทำกันเลย!"
                : "รอผู้สอนเพิ่มข้อสอบเข้ามา แล้วกลับมาดูใหม่อีกครั้งนะ"
            }
            action={
              isStaff && (
                <Link href="/admin/exams" className={btn.primary}>
                  + สร้างข้อสอบแรก
                </Link>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {exams.map((e, i) => {
            const latest = latestByExam.get(e.id);
            const open = openByExam.get(e.id);
            const avail = examAvailability(e);
            const used = usedByExam.get(e.id) ?? 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/exam/${e.slug}`}
                  className={`${card} flex h-full gap-4 hover:border-brand/40`}
                >
                  <TopicIcon index={i + 1} title={e.title} size={48} />
                  <div className="min-w-0 flex-1">
                    {e.courses?.title && (
                      <p className="text-xs text-ink-2">{e.courses.title}</p>
                    )}
                    <h2 className="font-semibold">{e.title}</h2>
                    {e.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-2">
                        {e.description}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                      <span>{e.questions.length} ข้อ</span>
                      {e.time_limit_minutes && (
                        <span>{e.time_limit_minutes} นาที</span>
                      )}
                      {e.passing_score != null && (
                        <span>ผ่านที่ {formatScore(e.passing_score)}</span>
                      )}
                      {e.max_attempts != null && (
                        <span>
                          ทำได้ {e.max_attempts} ครั้ง
                          {used ? ` (ใช้ ${used})` : ""}
                        </span>
                      )}
                      <span
                        className={
                          avail.state === "open"
                            ? ""
                            : avail.state === "upcoming"
                              ? "text-lemon"
                              : "text-danger"
                        }
                      >
                        {avail.label}
                      </span>
                      <span className="ml-auto">
                        {open ? (
                          <span className={badge.amber}>ทำค้างอยู่</span>
                        ) : latest ? (
                          <span
                            className={
                              latest.passed === false
                                ? badge.red
                                : latest.passed
                                  ? badge.green
                                  : badge.gray
                            }
                          >
                            ล่าสุด {formatScore(latest.score)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
