-- RLS audit fixes:
--
-- 1. attempt_answers: the "own open attempt" policy applied to every
--    command (select/insert/update/delete) via USING, but its
--    submitted_at-is-null check only lived in WITH CHECK (which governs
--    insert/update, not delete). A student could therefore DELETE their
--    own answers from an already-graded attempt via the REST API,
--    corrupting get_attempt_review()'s picture of what they answered.
--    Split into per-command policies so delete (and select) are covered.
--
-- 2. profiles: "update own" only locked the role column. email is synced
--    from auth.users by trigger specifically so staff pages can identify
--    who a row belongs to (see profile_email.sql) — leaving it
--    student-writable let a student desync it from their real login
--    identity. Lock it the same way role is locked.
--
-- 3. storage.objects: the videos/question-images bucket policies granted
--    blanket authenticated read with no tie back to publish status, even
--    though createSignedUrl() runs under the caller's own session (not
--    service role) and the videos/questions table policies already gate
--    on is_published. Anyone who obtained a storage_path/image_path for
--    unpublished content could fetch it directly, bypassing that gate
--    entirely. Tie the storage policies to the same publish checks.

-- ---------------------------------------------------------------------------
-- 1) attempt_answers
-- ---------------------------------------------------------------------------
drop policy "attempt_answers: own open attempt" on public.attempt_answers;

create policy "attempt_answers: read own"
  on public.attempt_answers for select to authenticated
  using (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid())
  );

create policy "attempt_answers: insert own while open"
  on public.attempt_answers for insert to authenticated
  with check (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid() and a.submitted_at is null)
  );

create policy "attempt_answers: update own while open"
  on public.attempt_answers for update to authenticated
  using (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid() and a.submitted_at is null)
  )
  with check (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid() and a.submitted_at is null)
  );

create policy "attempt_answers: delete own while open"
  on public.attempt_answers for delete to authenticated
  using (
    exists (select 1 from public.exam_attempts a
            where a.id = attempt_id and a.user_id = auth.uid() and a.submitted_at is null)
  );

-- ---------------------------------------------------------------------------
-- 2) profiles: lock email the same way role is locked.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where id = auth.uid();
$$;
grant execute on function public.current_user_email() to authenticated;

drop policy "profiles: update own (role locked)" on public.profiles;
create policy "profiles: update own (role and email locked)"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_user_role()
    and email is not distinct from public.current_user_email()
  );

-- ---------------------------------------------------------------------------
-- 3) storage.objects: gate reads on the same publish rules as the tables.
-- ---------------------------------------------------------------------------
drop policy "videos bucket: authenticated can read" on storage.objects;
create policy "videos bucket: read own-visible videos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'videos'
    and (
      public.is_staff()
      or exists (
        select 1 from public.videos v
        join public.courses c on c.id = v.course_id
        where v.storage_path = storage.objects.name
          and v.is_published and c.is_published
      )
    )
  );

drop policy "question-images: authenticated can read" on storage.objects;
create policy "question-images: read own-visible questions"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'question-images'
    and (
      public.is_staff()
      or exists (
        select 1 from public.questions q
        join public.exams e on e.id = q.exam_id
        where q.image_path = storage.objects.name
          and e.is_published
      )
    )
  );
