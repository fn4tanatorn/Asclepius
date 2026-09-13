-- Course-level feedback: one prompt when a student finishes every published
-- video in a course (mirrors exam_feedback's one-per-attempt shape), plus a
-- lightweight "report an issue" on individual videos that a student can use
-- any time, not gated on finishing anything.

create table public.course_feedback (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  course_comment  text,   -- ความรู้สึก/คำแนะนำต่อเนื้อหาคอร์สนี้
  general_comment text,   -- ต่อเว็บไซต์ / การเรียนรู้เนื้อหาแพทย์ในคลาส
  created_at      timestamptz not null default now(),
  unique (course_id, user_id),
  constraint course_feedback_not_empty check (
    btrim(coalesce(course_comment, '')) <> '' or btrim(coalesce(general_comment, '')) <> '')
);
create index course_feedback_course_id_idx on public.course_feedback (course_id, created_at desc);

alter table public.course_feedback enable row level security;

create policy "course_feedback: read own or staff"
  on public.course_feedback for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Only once all of the course's published videos are completed by the caller.
create policy "course_feedback: insert own after finishing course"
  on public.course_feedback for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.courses c where c.id = course_id and c.is_published)
    and not exists (
      select 1 from public.videos v
      where v.course_id = course_feedback.course_id and v.is_published
        and not exists (
          select 1 from public.video_progress p
          where p.video_id = v.id and p.user_id = auth.uid() and p.completed)
    )
  );

create policy "course_feedback: staff manages"
  on public.course_feedback for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
create table public.video_issue_reports (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.videos (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text not null check (btrim(message) <> ''),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index video_issue_reports_video_id_idx on public.video_issue_reports (video_id, created_at desc);
create index video_issue_reports_open_idx on public.video_issue_reports (resolved, created_at desc);

alter table public.video_issue_reports enable row level security;

create policy "video_issue_reports: read own or staff"
  on public.video_issue_reports for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Only on a video the caller can actually see (published, in a published course).
create policy "video_issue_reports: insert own for a viewable video"
  on public.video_issue_reports for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.videos v
      join public.courses c on c.id = v.course_id
      where v.id = video_id and v.is_published and c.is_published)
  );

create policy "video_issue_reports: staff manages"
  on public.video_issue_reports for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
