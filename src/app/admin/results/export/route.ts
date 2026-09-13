import { type NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-user";
import { formatDateTime, formatScore } from "@/lib/format";

/** Quotes a CSV field only when needed; doubles internal quotes. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(request: NextRequest) {
  const { supabase } = await requireStaff("/admin/results");
  const examId = request.nextUrl.searchParams.get("exam") ?? "";

  let q = supabase
    .from("exam_attempts")
    .select(
      "score, passed, submitted_at, exams(title), profiles(full_name, email, line_name)",
    )
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(5000);
  if (examId) q = q.eq("exam_id", examId);

  const { data: attempts } = await q;

  const header = ["ชื่อผู้เรียน", "อีเมล", "LINE", "ข้อสอบ", "ส่งเมื่อ", "คะแนน", "ผล"];
  const rows = (attempts ?? []).map((a) => [
    a.profiles?.full_name || "ไม่ระบุชื่อ",
    a.profiles?.email ?? "",
    a.profiles?.line_name ?? "",
    a.exams?.title ?? "",
    formatDateTime(a.submitted_at),
    formatScore(a.score),
    a.passed == null ? "-" : a.passed ? "ผ่าน" : "ไม่ผ่าน",
  ]);

  // Leading BOM so Excel (the realistic destination for this) reads the
  // Thai text as UTF-8 instead of guessing a legacy codepage.
  const csv =
    "﻿" +
    [header, ...rows]
      .map((row) => row.map((v) => csvField(String(v))).join(","))
      .join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="exam-results.csv"',
    },
  });
}
