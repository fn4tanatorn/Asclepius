import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { signQuestionImages } from "@/lib/storage";
import { badge, btn, card, input, label } from "@/components/ui";
import { Flash } from "@/components/flash";
import { ConfirmButton } from "@/components/confirm-button";
import { ImageField } from "@/components/image-field";
import { createQuestion, deleteExam, deleteQuestion, moveQuestion, updateExam, updateQuestion } from "../../actions";
import { NewQuestionFields } from "./question-form-fields";

export const metadata: Metadata = { title: "แก้ไขข้อสอบ" };

const LETTERS = "ABCDEF";

export default async function AdminExamPage({ params, searchParams }: PageProps<"/admin/exams/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireStaff(`/admin/exams/${id}`);

  const [{ data: exam }, { data: courses }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, slug, title, description, course_id, time_limit_minutes, passing_score, is_published, questions(id, kind, stem, image_path, explanation, points, position, choices(id, body, is_correct, position), answer_keys(id, answer, position))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("courses").select("id, title").order("title"),
  ]);
  if (!exam) notFound();

  const questions = [...exam.questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      ...q,
      choices: [...q.choices].sort((a, b) => a.position - b.position),
      answer_keys: [...q.answer_keys].sort((a, b) => a.position - b.position),
    }));
  const imageUrls = await signQuestionImages(supabase, questions.map((q) => q.image_path));

  return (
    <main className="space-y-8">
      <div>
        <Link href="/admin/exams" className="text-sm text-zinc-500 hover:underline">← ข้อสอบทั้งหมด</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{exam.title}</h1>
          <span className={exam.is_published ? badge.green : badge.gray}>{exam.is_published ? "เผยแพร่" : "ฉบับร่าง"}</span>
          <Link href={`/exam/${exam.slug}`} className={btn.link}>ดูแบบผู้เรียน</Link>
          <Link href={`/admin/results?exam=${exam.id}`} className={btn.link}>ผลสอบ</Link>
        </div>
      </div>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-8">
          <section>
            <h2 className="font-semibold">คำถาม ({questions.length})</h2>
            {questions.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">ยังไม่มีคำถาม เพิ่มจากฟอร์มด้านล่าง</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {questions.map((q, i) => {
                  const isText = q.kind === "text";
                  const correctIdx = q.choices.findIndex((c) => c.is_correct);
                  const warn = isText
                    ? q.answer_keys.length === 0
                    : q.choices.length < 2 || q.choices.filter((c) => c.is_correct).length !== 1;
                  const imgUrl = q.image_path ? imageUrls.get(q.image_path) ?? null : null;
                  return (
                    <li key={q.id} id={`q-${q.id}`} className={card}>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 w-6 text-sm text-zinc-500">{i + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={isText ? badge.amber : badge.gray}>{isText ? "พิมพ์คำตอบ" : "ตัวเลือก"}</span>
                            {q.image_path && <span className={badge.gray}>มีภาพ</span>}
                          </div>
                          <p className="mt-2 whitespace-pre-line font-medium">{q.stem}</p>
                          {imgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl} alt="" className="mt-2 max-h-48 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" />
                          )}
                          {isText ? (
                            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                              เฉลย: {q.answer_keys.map((k) => k.answer).join(" / ") || <span className="text-amber-600">ยังไม่มี</span>}
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-sm">
                              {q.choices.map((c, ci) => (
                                <li key={c.id} className={c.is_correct ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"}>
                                  {LETTERS[ci] ?? ci + 1}. {c.body}{c.is_correct ? " ✓" : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-2 text-xs text-zinc-500">
                            {Number(q.points)} คะแนน
                            {warn && <span className="text-amber-600"> · {isText ? "ต้องมีเฉลยอย่างน้อย 1 คำตอบ" : "ต้องมีตัวเลือก ≥2 และคำตอบถูก 1 ตัว"}</span>}
                          </p>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-zinc-500">แก้ไข</summary>
                            <form action={updateQuestion} className="mt-3 space-y-3">
                              <input type="hidden" name="id" value={q.id} />
                              <input type="hidden" name="exam_id" value={exam.id} />
                              <label className={label}><span>โจทย์</span><textarea name="stem" rows={3} defaultValue={q.stem} required className={input} /></label>
                              <div className={label}><span>ภาพประกอบ</span><ImageField examId={exam.id} initialPath={q.image_path} initialUrl={imgUrl} /></div>
                              {isText ? (
                                <label className={label}>
                                  <span>เฉลย (1 บรรทัดต่อ 1 คำตอบ)</span>
                                  <textarea name="answer_keys" rows={4} defaultValue={q.answer_keys.map((k) => k.answer).join("\n")} required className={input} />
                                </label>
                              ) : (
                                <fieldset className="space-y-2">
                                  <legend className="text-sm font-medium">ตัวเลือก (เลือกวงกลมหน้าคำตอบที่ถูก)</legend>
                                  {Array.from({ length: Math.max(4, q.choices.length + 1) }).map((_, ci) => {
                                    const c = q.choices[ci];
                                    return (
                                      <div key={c?.id ?? `new-${ci}`} className="flex items-center gap-2">
                                        <input type="radio" name="correct" value={ci} defaultChecked={ci === correctIdx} aria-label={`ข้อ ${LETTERS[ci]} ถูก`} />
                                        <input type="hidden" name="choice_id" value={c?.id ?? ""} />
                                        <span className="w-5 text-sm text-zinc-500">{LETTERS[ci]}.</span>
                                        <input name="choice_body" defaultValue={c?.body ?? ""} placeholder={c ? "" : "(ว่างไว้ถ้าไม่ใช้)"} className={input} />
                                      </div>
                                    );
                                  })}
                                </fieldset>
                              )}
                              <label className={label}><span>คำอธิบายเฉลย (แสดงหลังส่งข้อสอบ)</span><textarea name="explanation" rows={2} defaultValue={q.explanation ?? ""} className={input} /></label>
                              <label className={label}><span>คะแนน</span><input name="points" type="number" min={0.01} step="0.01" defaultValue={Number(q.points)} className={input} /></label>
                              <button type="submit" className={btn.secondary}>บันทึกคำถาม</button>
                            </form>
                          </details>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <form action={moveQuestion}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="exam_id" value={exam.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="rounded px-2 py-1 text-sm hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="เลื่อนขึ้น">↑</button></form>
                          <form action={moveQuestion}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="exam_id" value={exam.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === questions.length - 1} className="rounded px-2 py-1 text-sm hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800" aria-label="เลื่อนลง">↓</button></form>
                          <form action={deleteQuestion}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="exam_id" value={exam.id} /><ConfirmButton message={`ลบคำถามข้อ ${i + 1}?`} className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">ลบ</ConfirmButton></form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className={card}>
            <h2 className="font-semibold">เพิ่มคำถาม</h2>
            <form action={createQuestion} className="mt-4 space-y-4">
              <input type="hidden" name="exam_id" value={exam.id} />
              <NewQuestionFields />
              <label className={label}><span>โจทย์</span><textarea name="stem" rows={3} required placeholder="เช่น โครงสร้างที่ลูกศรชี้คืออะไร" className={input} /></label>
              <div className={label}><span>ภาพประกอบ (ไม่บังคับ)</span><ImageField examId={exam.id} /></div>
              <label className={label}><span>คำอธิบายเฉลย (ไม่บังคับ)</span><textarea name="explanation" rows={2} className={input} /></label>
              <label className={label}><span>คะแนน</span><input name="points" type="number" min={0.01} step="0.01" defaultValue={1} className={input} /></label>
              <button type="submit" className={btn.primary}>เพิ่มคำถาม</button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={card}>
            <h2 className="font-semibold">ตั้งค่าข้อสอบ</h2>
            <form action={updateExam} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={exam.id} />
              <label className={label}><span>ชื่อ</span><input name="title" defaultValue={exam.title} required className={input} /></label>
              <label className={label}><span>slug</span><input name="slug" defaultValue={exam.slug} className={input} /></label>
              <label className={label}><span>คำอธิบาย</span><textarea name="description" rows={3} defaultValue={exam.description ?? ""} className={input} /></label>
              <label className={label}>
                <span>คอร์สที่เกี่ยวข้อง</span>
                <select name="course_id" className={input} defaultValue={exam.course_id ?? ""}>
                  <option value="">— ไม่ระบุ —</option>
                  {courses?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label className={label}><span>เวลา (นาที, ว่าง = ไม่จำกัด)</span><input name="time_limit_minutes" type="number" min={1} defaultValue={exam.time_limit_minutes ?? ""} className={input} /></label>
              <label className={label}><span>เกณฑ์ผ่าน (%, ว่าง = ไม่กำหนด)</span><input name="passing_score" type="number" min={0} max={100} step="0.01" defaultValue={exam.passing_score ?? ""} className={input} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={exam.is_published} /> เผยแพร่ให้ผู้เรียนทำ</label>
              <button type="submit" className={`${btn.primary} w-full`}>บันทึก</button>
            </form>
            <form action={deleteExam} className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <input type="hidden" name="id" value={exam.id} />
              <ConfirmButton message="ลบข้อสอบนี้พร้อมคำถามและผลสอบทั้งหมด? ย้อนกลับไม่ได้" className={btn.danger}>ลบข้อสอบ</ConfirmButton>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
