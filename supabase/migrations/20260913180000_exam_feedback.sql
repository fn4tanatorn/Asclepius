-- Post-exam feedback: one per attempt. Students write their own; staff read all.
create table public.exam_feedback (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null unique references public.exam_attempts (id) on delete cascade,
  exam_id         uuid not null references public.exams (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  exam_comment    text,   -- ความรู้สึก/คำแนะนำต่อข้อสอบครั้งนี้
  general_comment text,   -- ต่อเว็บไซต์ / การเรียนรู้เนื้อหาแพทย์ในคลาส
  created_at      timestamptz not null default now(),
  constraint exam_feedback_not_empty check (
    btrim(coalesce(exam_comment, '')) <> '' or btrim(coalesce(general_comment, '')) <> '')
);
create index exam_feedback_exam_id_idx on public.exam_feedback (exam_id, created_at desc);

alter table public.exam_feedback enable row level security;

create policy "exam_feedback: read own or staff"
  on public.exam_feedback for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Only for your own, already-submitted attempt; exam_id must match the attempt.
create policy "exam_feedback: insert own after submit"
  on public.exam_feedback for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
        and a.exam_id = exam_feedback.exam_id and a.submitted_at is not null)
  );

create policy "exam_feedback: staff manages"
  on public.exam_feedback for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
