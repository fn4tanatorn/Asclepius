"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { slugify } from "@/lib/format";
import { fromBangkokLocalInput } from "@/lib/exam-status";
import type { Database } from "@/lib/supabase/database.types";

type Role = Database["public"]["Enums"]["user_role"];

const str = (fd: FormData, k: string) => fd.get(k)?.toString().trim() ?? "";
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const bool = (fd: FormData, k: string) =>
  fd.get(k) === "on" || fd.get(k) === "true";

function withMsg(path: string, key: "ok" | "error", msg: string) {
  return `${path}?${key}=${encodeURIComponent(msg)}`;
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
export async function createCourse(formData: FormData) {
  const { supabase, user } = await requireStaff("/admin/courses");
  const title = str(formData, "title");
  const slug = slugify(str(formData, "slug") || title);
  if (!title || !slug)
    redirect(withMsg("/admin/courses", "error", "กรุณากรอกชื่อคอร์ส"));

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      slug,
      description: optStr(formData, "description"),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    redirect(
      withMsg(
        "/admin/courses",
        "error",
        error?.code === "23505" ? "slug นี้ถูกใช้แล้ว" : "สร้างคอร์สไม่สำเร็จ",
      ),
    );
  }
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const path = `/admin/courses/${id}`;
  const title = str(formData, "title");
  const slug = slugify(str(formData, "slug") || title);
  if (!title || !slug) redirect(withMsg(path, "error", "กรุณากรอกชื่อคอร์ส"));

  const { error } = await supabase
    .from("courses")
    .update({
      title,
      slug,
      description: optStr(formData, "description"),
      is_published: bool(formData, "is_published"),
    })
    .eq("id", id);
  if (error)
    redirect(
      withMsg(
        path,
        "error",
        error.code === "23505" ? "slug นี้ถูกใช้แล้ว" : "บันทึกไม่สำเร็จ",
      ),
    );

  revalidatePath("/admin/courses");
  revalidatePath("/learn");
  redirect(withMsg(path, "ok", "บันทึกแล้ว"));
}

export async function deleteCourse(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");

  // Remove uploaded files first so the bucket does not keep orphans.
  const { data: vids } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("course_id", id);
  const paths = (vids ?? [])
    .map((v) => v.storage_path)
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("videos").remove(paths);

  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) redirect(withMsg(`/admin/courses/${id}`, "error", "ลบไม่สำเร็จ"));
  revalidatePath("/admin/courses");
  revalidatePath("/learn");
  redirect(withMsg("/admin/courses", "ok", "ลบคอร์สแล้ว"));
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
export async function createVideo(formData: FormData) {
  const { supabase } = await requireStaff();
  const courseId = str(formData, "course_id");
  const path = `/admin/courses/${courseId}`;
  const title = str(formData, "title");
  const storagePath = optStr(formData, "storage_path");
  const externalUrl = optStr(formData, "external_url");
  if (!title) redirect(withMsg(path, "error", "กรุณากรอกชื่อวิดีโอ"));
  if (!storagePath && !externalUrl)
    redirect(withMsg(path, "error", "ต้องอัปโหลดไฟล์หรือใส่ลิงก์วิดีโอ"));

  const { data: last } = await supabase
    .from("videos")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("videos").insert({
    course_id: courseId,
    title,
    description: optStr(formData, "description"),
    storage_path: storagePath,
    external_url: storagePath ? null : externalUrl,
    duration_seconds: num(formData, "duration_seconds"),
    position: (last?.position ?? -1) + 1,
    is_published: bool(formData, "is_published"),
  });
  if (error) redirect(withMsg(path, "error", "เพิ่มวิดีโอไม่สำเร็จ"));
  revalidatePath(path);
  revalidatePath("/learn");
  redirect(withMsg(path, "ok", "เพิ่มวิดีโอแล้ว"));
}

export async function updateVideo(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const courseId = str(formData, "course_id");
  const path = `/admin/courses/${courseId}`;
  const title = str(formData, "title");
  if (!title) redirect(withMsg(path, "error", "กรุณากรอกชื่อวิดีโอ"));

  const patch: Database["public"]["Tables"]["videos"]["Update"] = {
    title,
    description: optStr(formData, "description"),
    duration_seconds: num(formData, "duration_seconds"),
    is_published: bool(formData, "is_published"),
  };
  // Only allow changing the external URL for URL-based videos; file-based keep their path.
  if (formData.has("external_url")) {
    const url = optStr(formData, "external_url");
    if (!url) redirect(withMsg(path, "error", "กรุณาใส่ลิงก์วิดีโอ"));
    patch.external_url = url;
  }

  const { error } = await supabase.from("videos").update(patch).eq("id", id);
  if (error) redirect(withMsg(path, "error", "บันทึกไม่สำเร็จ"));
  revalidatePath(path);
  revalidatePath("/learn");
  redirect(withMsg(path, "ok", "บันทึกวิดีโอแล้ว"));
}

export async function deleteVideo(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const courseId = str(formData, "course_id");
  const path = `/admin/courses/${courseId}`;

  const { data: v } = await supabase
    .from("videos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (v?.storage_path)
    await supabase.storage.from("videos").remove([v.storage_path]);

  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) redirect(withMsg(path, "error", "ลบไม่สำเร็จ"));
  revalidatePath(path);
  revalidatePath("/learn");
  redirect(withMsg(path, "ok", "ลบวิดีโอแล้ว"));
}

export async function moveVideo(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const courseId = str(formData, "course_id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  const path = `/admin/courses/${courseId}`;

  const { data: vids } = await supabase
    .from("videos")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position");
  await swapPositions(vids ?? [], id, dir, async (rowId, position) => {
    await supabase.from("videos").update({ position }).eq("id", rowId);
  });
  revalidatePath(path);
  revalidatePath("/learn");
  redirect(path);
}

/** Called after a successful browser upload to register the row. Returns instead of redirecting. */
export async function registerUploadedVideo(input: {
  courseId: string;
  title: string;
  storagePath: string;
  durationSeconds: number | null;
}): Promise<{ ok: boolean }> {
  const { supabase } = await requireStaff();
  const title = input.title.trim();
  if (!title || !input.storagePath.startsWith(`${input.courseId}/`))
    return { ok: false };

  const { data: last } = await supabase
    .from("videos")
    .select("position")
    .eq("course_id", input.courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("videos").insert({
    course_id: input.courseId,
    title,
    storage_path: input.storagePath,
    duration_seconds:
      input.durationSeconds == null
        ? null
        : Math.max(0, Math.round(input.durationSeconds)),
    position: (last?.position ?? -1) + 1,
    is_published: false,
  });
  if (error) return { ok: false };
  revalidatePath(`/admin/courses/${input.courseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------
export async function createExam(formData: FormData) {
  const { supabase, user } = await requireStaff("/admin/exams");
  const title = str(formData, "title");
  const slug = slugify(str(formData, "slug") || title);
  if (!title || !slug)
    redirect(withMsg("/admin/exams", "error", "กรุณากรอกชื่อข้อสอบ"));

  const { data, error } = await supabase
    .from("exams")
    .insert({
      title,
      slug,
      description: optStr(formData, "description"),
      course_id: optStr(formData, "course_id"),
      time_limit_minutes: num(formData, "time_limit_minutes"),
      passing_score: num(formData, "passing_score"),
      max_attempts: num(formData, "max_attempts"),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    redirect(
      withMsg(
        "/admin/exams",
        "error",
        error?.code === "23505" ? "slug นี้ถูกใช้แล้ว" : "สร้างข้อสอบไม่สำเร็จ",
      ),
    );
  }
  revalidatePath("/admin/exams");
  redirect(`/admin/exams/${data.id}`);
}

export async function updateExam(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const path = `/admin/exams/${id}`;
  const title = str(formData, "title");
  const slug = slugify(str(formData, "slug") || title);
  if (!title || !slug) redirect(withMsg(path, "error", "กรุณากรอกชื่อข้อสอบ"));

  const opensAt = fromBangkokLocalInput(str(formData, "opens_at"));
  const closesAt = fromBangkokLocalInput(str(formData, "closes_at"));
  if (opensAt && closesAt && closesAt <= opensAt)
    redirect(withMsg(path, "error", "เวลาปิดต้องอยู่หลังเวลาเปิด"));

  const publish = bool(formData, "is_published");
  if (publish) {
    const problem = await validateExamForPublish(supabase, id);
    if (problem) redirect(withMsg(path, "error", problem));
  }

  const { error } = await supabase
    .from("exams")
    .update({
      title,
      slug,
      description: optStr(formData, "description"),
      course_id: optStr(formData, "course_id"),
      time_limit_minutes: num(formData, "time_limit_minutes"),
      passing_score: num(formData, "passing_score"),
      reveal_answers: bool(formData, "reveal_answers"),
      fuzzy_matching: bool(formData, "fuzzy_matching"),
      max_attempts: num(formData, "max_attempts"),
      opens_at: opensAt,
      closes_at: closesAt,
      is_published: publish,
    })
    .eq("id", id);
  if (error)
    redirect(
      withMsg(
        path,
        "error",
        error.code === "23505" ? "slug นี้ถูกใช้แล้ว" : "บันทึกไม่สำเร็จ",
      ),
    );

  revalidatePath("/admin/exams");
  revalidatePath("/exam");
  redirect(withMsg(path, "ok", "บันทึกแล้ว"));
}

async function validateExamForPublish(
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"],
  examId: string,
): Promise<string | null> {
  const { data: qs } = await supabase
    .from("questions")
    .select("id, kind, position, choices(id, is_correct), answer_keys(id)")
    .eq("exam_id", examId)
    .order("position");
  if (!qs?.length) return "ต้องมีคำถามอย่างน้อย 1 ข้อก่อนเผยแพร่";
  for (const [i, q] of qs.entries()) {
    if (q.kind === "text") {
      if (q.answer_keys.length === 0)
        return `ข้อ ${i + 1} ต้องมีเฉลยอย่างน้อย 1 คำตอบ`;
      continue;
    }
    if (q.choices.length < 2)
      return `ข้อ ${i + 1} ต้องมีตัวเลือกอย่างน้อย 2 ตัว`;
    const correct = q.choices.filter((c) => c.is_correct).length;
    if (correct !== 1)
      return `ข้อ ${i + 1} ต้องมีคำตอบที่ถูกต้อง 1 ตัวเลือก (ตอนนี้มี ${correct})`;
  }
  return null;
}

export async function deleteExam(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const { data: qs } = await supabase
    .from("questions")
    .select("image_path")
    .eq("exam_id", id);
  const imgs = (qs ?? [])
    .map((q) => q.image_path)
    .filter((p): p is string => !!p);
  if (imgs.length) await supabase.storage.from("question-images").remove(imgs);
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) redirect(withMsg(`/admin/exams/${id}`, "error", "ลบไม่สำเร็จ"));
  revalidatePath("/admin/exams");
  revalidatePath("/exam");
  redirect(withMsg("/admin/exams", "ok", "ลบข้อสอบแล้ว"));
}

// ---------------------------------------------------------------------------
// Questions & choices
// Form shape: stem, explanation, points, choice_body[] (4+ inputs), correct (index)
// ---------------------------------------------------------------------------
function readChoices(formData: FormData) {
  const bodies = formData.getAll("choice_body").map((b) => b.toString().trim());
  const correctIdx = Number(str(formData, "correct"));
  return bodies
    .map((body, i) => ({ body, is_correct: i === correctIdx, position: i }))
    .filter((c) => c.body !== "")
    .map((c, i) => ({ ...c, position: i }));
}

/** One accepted answer per line. */
function readAnswerKeys(formData: FormData) {
  const seen = new Set<string>();
  return str(formData, "answer_keys")
    .split(/\r?\n/)
    .map((a) => a.trim())
    .filter((a) => a && !seen.has(a.toLowerCase()) && seen.add(a.toLowerCase()))
    .map((answer, position) => ({ answer, position }));
}

function readKind(
  formData: FormData,
): Database["public"]["Enums"]["question_kind"] {
  return str(formData, "kind") === "text" ? "text" : "choice";
}

/** Only accept image paths inside this exam's folder (uploaded by ImageField). */
function readImagePath(formData: FormData, examId: string) {
  const p = optStr(formData, "image_path");
  return p && p.startsWith(`${examId}/`) && !p.includes("..") ? p : null;
}

export async function createQuestion(formData: FormData) {
  const { supabase } = await requireStaff();
  const examId = str(formData, "exam_id");
  const path = `/admin/exams/${examId}`;
  const stem = str(formData, "stem");
  const kind = readKind(formData);
  const imagePath = readImagePath(formData, examId);
  if (!stem) redirect(withMsg(path, "error", "กรุณากรอกโจทย์"));

  const choices = kind === "choice" ? readChoices(formData) : [];
  const keys = kind === "text" ? readAnswerKeys(formData) : [];
  if (kind === "choice") {
    if (choices.length < 2)
      redirect(withMsg(path, "error", "ต้องมีตัวเลือกอย่างน้อย 2 ตัว"));
    if (!choices.some((c) => c.is_correct))
      redirect(withMsg(path, "error", "กรุณาเลือกคำตอบที่ถูกต้อง"));
  } else if (keys.length === 0) {
    redirect(withMsg(path, "error", "กรุณาใส่เฉลยอย่างน้อย 1 คำตอบ"));
  }

  const { data: last } = await supabase
    .from("questions")
    .select("position")
    .eq("exam_id", examId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: q, error } = await supabase
    .from("questions")
    .insert({
      exam_id: examId,
      kind,
      stem,
      image_path: imagePath,
      explanation: optStr(formData, "explanation"),
      points: num(formData, "points") ?? 1,
      position: (last?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !q) redirect(withMsg(path, "error", "เพิ่มคำถามไม่สำเร็จ"));

  const { error: subErr } =
    kind === "choice"
      ? await supabase
          .from("choices")
          .insert(choices.map((c) => ({ ...c, question_id: q.id })))
      : await supabase
          .from("answer_keys")
          .insert(keys.map((k) => ({ ...k, question_id: q.id })));
  if (subErr) {
    await supabase.from("questions").delete().eq("id", q.id);
    redirect(
      withMsg(
        path,
        "error",
        kind === "choice" ? "เพิ่มตัวเลือกไม่สำเร็จ" : "เพิ่มเฉลยไม่สำเร็จ",
      ),
    );
  }
  revalidatePath(path);
  redirect(withMsg(path, "ok", "เพิ่มคำถามแล้ว") + `#q-${q.id}`);
}

export async function updateQuestion(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const examId = str(formData, "exam_id");
  const path = `/admin/exams/${examId}`;
  const stem = str(formData, "stem");
  if (!stem) redirect(withMsg(path, "error", "กรุณากรอกโจทย์"));

  const { data: current } = await supabase
    .from("questions")
    .select("kind, image_path")
    .eq("id", id)
    .maybeSingle();
  if (!current) redirect(withMsg(path, "error", "ไม่พบคำถาม"));
  const kind = current.kind; // kind is fixed after creation
  const imagePath = readImagePath(formData, examId);

  if (kind === "choice") {
    const ids = formData.getAll("choice_id").map((v) => v.toString());
    const bodies = formData
      .getAll("choice_body")
      .map((v) => v.toString().trim());
    const correctIdx = Number(str(formData, "correct"));
    const kept = bodies
      .map((body, i) => ({
        id: ids[i] || null,
        body,
        is_correct: i === correctIdx,
      }))
      .filter((c) => c.body);
    if (kept.length < 2)
      redirect(withMsg(path, "error", "ต้องมีตัวเลือกอย่างน้อย 2 ตัว"));
    if (!kept.some((c) => c.is_correct))
      redirect(withMsg(path, "error", "กรุณาเลือกคำตอบที่ถูกต้อง"));

    const keepIds = kept.map((c) => c.id).filter((x): x is string => !!x);
    const { data: existing } = await supabase
      .from("choices")
      .select("id")
      .eq("question_id", id);
    const toDelete = (existing ?? [])
      .map((c) => c.id)
      .filter((cid) => !keepIds.includes(cid));
    if (toDelete.length)
      await supabase.from("choices").delete().in("id", toDelete);
    for (const [i, c] of kept.entries()) {
      if (c.id)
        await supabase
          .from("choices")
          .update({ body: c.body, is_correct: c.is_correct, position: i })
          .eq("id", c.id);
      else
        await supabase.from("choices").insert({
          question_id: id,
          body: c.body,
          is_correct: c.is_correct,
          position: i,
        });
    }
  } else {
    const keys = readAnswerKeys(formData);
    if (keys.length === 0)
      redirect(withMsg(path, "error", "กรุณาใส่เฉลยอย่างน้อย 1 คำตอบ"));
    await supabase.from("answer_keys").delete().eq("question_id", id);
    const { error: kErr } = await supabase
      .from("answer_keys")
      .insert(keys.map((k) => ({ ...k, question_id: id })));
    if (kErr) redirect(withMsg(path, "error", "บันทึกเฉลยไม่สำเร็จ"));
  }

  const { error } = await supabase
    .from("questions")
    .update({
      stem,
      image_path: imagePath,
      explanation: optStr(formData, "explanation"),
      points: num(formData, "points") ?? 1,
    })
    .eq("id", id);
  if (error) redirect(withMsg(path, "error", "บันทึกไม่สำเร็จ"));

  if (current.image_path && current.image_path !== imagePath) {
    await supabase.storage.from("question-images").remove([current.image_path]);
  }
  revalidatePath(path);
  redirect(withMsg(path, "ok", "บันทึกคำถามแล้ว") + `#q-${id}`);
}

export async function deleteQuestion(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const examId = str(formData, "exam_id");
  const path = `/admin/exams/${examId}`;
  const { data: q } = await supabase
    .from("questions")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) redirect(withMsg(path, "error", "ลบไม่สำเร็จ"));
  if (q?.image_path)
    await supabase.storage.from("question-images").remove([q.image_path]);
  revalidatePath(path);
  redirect(withMsg(path, "ok", "ลบคำถามแล้ว"));
}

export async function moveQuestion(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const examId = str(formData, "exam_id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  const path = `/admin/exams/${examId}`;

  const { data: qs } = await supabase
    .from("questions")
    .select("id, position")
    .eq("exam_id", examId)
    .order("position");
  await swapPositions(qs ?? [], id, dir, async (rowId, position) => {
    await supabase.from("questions").update({ position }).eq("id", rowId);
  });
  revalidatePath(path);
  redirect(`${path}#q-${id}`);
}

/** Normalise positions to 0..n-1 then swap the target with its neighbour. */
async function swapPositions(
  rows: { id: string; position: number }[],
  id: string,
  dir: -1 | 1,
  write: (id: string, position: number) => Promise<unknown>,
) {
  const idx = rows.findIndex((r) => r.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= rows.length) return;
  const order = rows.map((r) => r.id);
  [order[idx], order[j]] = [order[j], order[idx]];
  await Promise.all(order.map((rowId, pos) => write(rowId, pos)));
}

// ---------------------------------------------------------------------------
// Users (admin only)
// ---------------------------------------------------------------------------
export async function updateUserRole(formData: FormData) {
  const { supabase, role, user } = await requireStaff("/admin/users");
  if (role !== "admin")
    redirect(withMsg("/admin/users", "error", "เฉพาะผู้ดูแลระบบเท่านั้น"));
  const id = str(formData, "id");
  const newRole = str(formData, "role") as Role;
  if (!["student", "instructor", "admin"].includes(newRole))
    redirect(withMsg("/admin/users", "error", "บทบาทไม่ถูกต้อง"));
  if (id === user.id && newRole !== "admin")
    redirect(withMsg("/admin/users", "error", "ไม่สามารถลดสิทธิ์ตัวเองได้"));

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", id);
  if (error) redirect(withMsg("/admin/users", "error", "บันทึกไม่สำเร็จ"));
  revalidatePath("/admin/users");
  redirect(withMsg("/admin/users", "ok", "เปลี่ยนบทบาทแล้ว"));
}

// ---------------------------------------------------------------------------
// Bulk import of "identify" questions: one image per question, answers parsed
// from the filename by the client. Images are already uploaded by the browser.
// ---------------------------------------------------------------------------
export async function bulkCreateTextQuestions(input: {
  examId: string;
  stem: string;
  points: number;
  explanation: string | null;
  items: { imagePath: string; answers: string[] }[];
}): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const { supabase } = await requireStaff();
  const stem = input.stem.trim();
  if (!stem) return { ok: false, error: "กรุณากรอกโจทย์" };
  const points =
    Number.isFinite(input.points) && input.points > 0 ? input.points : 1;

  const items = input.items
    .map((it) => ({
      imagePath: it.imagePath,
      answers: [
        ...new Set(
          it.answers.map((a) => a.normalize("NFC").trim()).filter(Boolean),
        ),
      ],
    }))
    .filter(
      (it) =>
        it.imagePath.startsWith(`${input.examId}/`) &&
        !it.imagePath.includes("..") &&
        it.answers.length > 0,
    );
  if (items.length === 0)
    return { ok: false, error: "ไม่มีรายการที่นำเข้าได้" };
  if (items.length > 200)
    return { ok: false, error: "นำเข้าได้ครั้งละไม่เกิน 200 ข้อ" };

  const { data: last } = await supabase
    .from("questions")
    .select("position")
    .eq("exam_id", input.examId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const base = (last?.position ?? -1) + 1;

  const { data: qs, error } = await supabase
    .from("questions")
    .insert(
      items.map((it, i) => ({
        exam_id: input.examId,
        kind: "text" as const,
        stem,
        image_path: it.imagePath,
        explanation: input.explanation?.trim() || null,
        points,
        position: base + i,
      })),
    )
    .select("id, position");
  if (error || !qs) return { ok: false, error: "สร้างคำถามไม่สำเร็จ" };

  const byPos = new Map(qs.map((q) => [q.position, q.id]));
  const keys = items.flatMap((it, i) =>
    it.answers.map((answer, position) => ({
      question_id: byPos.get(base + i)!,
      answer,
      position,
    })),
  );
  const { error: kErr } = await supabase.from("answer_keys").insert(keys);
  if (kErr) {
    await supabase
      .from("questions")
      .delete()
      .in(
        "id",
        qs.map((q) => q.id),
      );
    return { ok: false, error: "บันทึกเฉลยไม่สำเร็จ" };
  }

  revalidatePath(`/admin/exams/${input.examId}`);
  return { ok: true, created: qs.length };
}

// ---------------------------------------------------------------------------
// Video issue reports
// ---------------------------------------------------------------------------
export async function toggleReportResolved(formData: FormData) {
  const { supabase } = await requireStaff();
  const id = str(formData, "id");
  const resolved = str(formData, "resolved") === "true";
  const { error } = await supabase
    .from("video_issue_reports")
    .update({ resolved: !resolved })
    .eq("id", id);
  if (!error) revalidatePath("/admin/video-reports");
}
