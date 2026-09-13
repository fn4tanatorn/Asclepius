-- KawaiiMedicine: initial schema for MedEd (video lessons + exams)
-- Apply with: supabase db push

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'instructor', 'admin');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'student',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so they can be used inside RLS policies
-- without recursing into profiles' own policies).
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('instructor', 'admin'), false);
$$;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Courses & videos
-- ---------------------------------------------------------------------------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text,
  is_published boolean not null default false,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  title            text not null,
  description      text,
  -- Either a path in the private "videos" storage bucket, or an external URL (YouTube, Vimeo, ...)
  storage_path     text,
  external_url     text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  position         integer not null default 0,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint videos_has_source check (storage_path is not null or external_url is not null)
);

create index videos_course_id_position_idx on public.videos (course_id, position);

create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

create table public.video_progress (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  video_id        uuid not null references public.videos (id) on delete cascade,
  seconds_watched integer not null default 0 check (seconds_watched >= 0),
  completed       boolean not null default false,
  updated_at      timestamptz not null default now(),
  primary key (user_id, video_id)
);

create trigger video_progress_set_updated_at
  before update on public.video_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Exams
-- ---------------------------------------------------------------------------
create table public.exams (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid references public.courses (id) on delete set null,
  slug               text not null unique,
  title              text not null,
  description        text,
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes > 0),
  passing_score      numeric(5,2) check (passing_score is null or (passing_score >= 0 and passing_score <= 100)),
  is_published       boolean not null default false,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references public.exams (id) on delete cascade,
  stem        text not null,
  explanation text,
  points      numeric(6,2) not null default 1 check (points > 0),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index questions_exam_id_position_idx on public.questions (exam_id, position);

-- NOTE: is_correct must never be readable by students. Students read choices
-- through the exam_choices view below; grading happens in submit_exam_attempt().
create table public.choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  body        text not null,
  is_correct  boolean not null default false,
  position    integer not null default 0
);

create index choices_question_id_position_idx on public.choices (question_id, position);

create table public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references public.exams (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  score        numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  passed       boolean
);

create index exam_attempts_user_id_idx on public.exam_attempts (user_id, exam_id);

create table public.attempt_answers (
  attempt_id  uuid not null references public.exam_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  choice_id   uuid references public.choices (id) on delete set null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Student-safe view of choices (no is_correct). Security definer view: it
-- bypasses RLS on choices, so it must filter to published exams itself.
-- ---------------------------------------------------------------------------
create view public.exam_choices
with (security_invoker = false)
as
  select c.id, c.question_id, c.body, c.position
  from public.choices c
  join public.questions q on q.id = c.question_id
  join public.exams e on e.id = q.exam_id
  where e.is_published;

-- ---------------------------------------------------------------------------
-- Grading RPC: called by the student to submit their own attempt.
-- ---------------------------------------------------------------------------
create or replace function public.submit_exam_attempt(p_attempt_id uuid)
returns public.exam_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt   public.exam_attempts;
  v_total     numeric;
  v_earned    numeric;
  v_score     numeric(5,2);
  v_passing   numeric;
begin
  select * into v_attempt from public.exam_attempts where id = p_attempt_id;

  if v_attempt.id is null or v_attempt.user_id <> auth.uid() then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  if v_attempt.submitted_at is not null then
    raise exception 'attempt already submitted' using errcode = 'P0001';
  end if;

  select coalesce(sum(q.points), 0) into v_total
  from public.questions q where q.exam_id = v_attempt.exam_id;

  select coalesce(sum(q.points), 0) into v_earned
  from public.attempt_answers a
  join public.questions q on q.id = a.question_id
  join public.choices c on c.id = a.choice_id
  where a.attempt_id = p_attempt_id and c.is_correct;

  v_score := case when v_total = 0 then 0 else round(v_earned / v_total * 100, 2) end;

  select passing_score into v_passing from public.exams where id = v_attempt.exam_id;

  update public.exam_attempts
  set submitted_at = now(),
      score = v_score,
      passed = case when v_passing is null then null else v_score >= v_passing end
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.videos          enable row level security;
alter table public.video_progress  enable row level security;
alter table public.exams           enable row level security;
alter table public.questions       enable row level security;
alter table public.choices         enable row level security;
alter table public.exam_attempts   enable row level security;
alter table public.attempt_answers enable row level security;

-- profiles
create policy "profiles: read own or staff reads all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles: update own (role locked)"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());
create policy "profiles: admin manages all"
  on public.profiles for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- courses
create policy "courses: published readable"
  on public.courses for select to authenticated
  using (is_published or public.is_staff());
create policy "courses: staff manages"
  on public.courses for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- videos
create policy "videos: published readable"
  on public.videos for select to authenticated
  using (
    public.is_staff()
    or (is_published and exists (
      select 1 from public.courses c where c.id = course_id and c.is_published))
  );
create policy "videos: staff manages"
  on public.videos for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- video_progress
create policy "video_progress: own rows"
  on public.video_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "video_progress: staff reads all"
  on public.video_progress for select to authenticated
  using (public.is_staff());

-- exams
create policy "exams: published readable"
  on public.exams for select to authenticated
  using (is_published or public.is_staff());
create policy "exams: staff manages"
  on public.exams for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- questions
create policy "questions: published readable"
  on public.questions for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.exams e where e.id = exam_id and e.is_published)
  );
create policy "questions: staff manages"
  on public.questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- choices: staff only. Students use the exam_choices view.
create policy "choices: staff only"
  on public.choices for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- exam_attempts
create policy "exam_attempts: own rows"
  on public.exam_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "exam_attempts: start own on published exam"
  on public.exam_attempts for insert to authenticated
  with check (
    user_id = auth.uid()
    and submitted_at is null and score is null and passed is null
    and exists (select 1 from public.exams e where e.id = exam_id and e.is_published)
  );
-- No update policy for students: scoring goes through submit_exam_attempt().
create policy "exam_attempts: staff manages"
  on public.exam_attempts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- attempt_answers
create policy "attempt_answers: own open attempt"
  on public.attempt_answers for all to authenticated
  using (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid() and a.submitted_at is null)
  );
create policy "attempt_answers: staff reads all"
  on public.attempt_answers for select to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.exam_choices to authenticated;
grant execute on function public.submit_exam_attempt(uuid) to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for lesson videos. Serve via signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', false, 2147483648, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "videos bucket: authenticated can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'videos');
create policy "videos bucket: staff can write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and public.is_staff());
create policy "videos bucket: staff can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'videos' and public.is_staff());
create policy "videos bucket: staff can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public.is_staff());
