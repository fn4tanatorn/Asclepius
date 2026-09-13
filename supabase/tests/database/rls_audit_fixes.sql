-- pgTAP tests for the RLS audit fixes in 20260913132026_rls_audit_fixes.sql:
-- attempt_answers can't be deleted post-submission, profiles.email can't be
-- self-edited (but staff can still edit others'), and the videos/
-- question-images storage buckets only reveal published content to students.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select gen_random_uuid() as student_a \gset
select gen_random_uuid() as admin_user \gset
select gen_random_uuid() as course1 \gset
select gen_random_uuid() as exam1 \gset
select gen_random_uuid() as q_choice \gset
select gen_random_uuid() as choice_correct \gset
select gen_random_uuid() as attempt_open \gset
select gen_random_uuid() as attempt_submitted \gset
select gen_random_uuid() as video_pub \gset
select gen_random_uuid() as video_unpub \gset
select gen_random_uuid() as exam_unpub \gset

insert into auth.users (id, email) values
  (:'student_a', 'rls-student-a@test.local'),
  (:'admin_user', 'rls-admin@test.local');
update public.profiles set role = 'admin' where id = :'admin_user';

insert into public.courses (id, slug, title, is_published)
values (:'course1', 'ci-rls-course', 'CI RLS Course', true);

insert into public.exams (id, course_id, slug, title, is_published)
values
  (:'exam1',      :'course1', 'ci-rls-exam-pub',   'CI RLS Exam', true),
  (:'exam_unpub', :'course1', 'ci-rls-exam-unpub', 'CI RLS Exam Unpub', false);

insert into public.questions (id, exam_id, stem, points, position, kind, image_path)
values
  (:'q_choice', :'exam1', 'Pick the correct one', 1, 0, 'choice', 'qimg/pub.png'),
  (gen_random_uuid(), :'exam_unpub', 'Draft question', 1, 0, 'choice', 'qimg/unpub.png');

insert into public.choices (id, question_id, body, is_correct, position)
values (:'choice_correct', :'q_choice', 'Correct', true, 0);

insert into public.videos (id, course_id, storage_path, title, is_published)
values
  (:'video_pub',   :'course1', 'videos/pub.mp4',   'Published video', true),
  (:'video_unpub', :'course1', 'videos/unpub.mp4', 'Draft video', false);

-- One open attempt (answer still deletable) and one already-submitted attempt
-- (answer should no longer be deletable).
insert into public.exam_attempts (id, exam_id, user_id, submitted_at)
values
  (:'attempt_open',      :'exam1', :'student_a', null),
  (:'attempt_submitted', :'exam1', :'student_a', now());
insert into public.attempt_answers (attempt_id, question_id, choice_id)
values
  (:'attempt_open',      :'q_choice', :'choice_correct'),
  (:'attempt_submitted', :'q_choice', :'choice_correct');

insert into storage.objects (bucket_id, name) values
  ('videos', 'videos/pub.mp4'),
  ('videos', 'videos/unpub.mp4'),
  ('question-images', 'qimg/pub.png'),
  ('question-images', 'qimg/unpub.png');

-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

-- 1) attempt_answers: delete is fine on an open attempt, blocked once submitted.
select lives_ok(
  format('delete from public.attempt_answers where attempt_id = %L::uuid and question_id = %L::uuid',
    :'attempt_open', :'q_choice'),
  'deleting an answer on an open (not yet submitted) attempt is allowed'
);

-- RLS's USING clause filters DELETE targets silently (no exception, just
-- 0 rows affected) — unlike WITH CHECK on insert/update, which does throw.
-- So verify the row survives, rather than expecting an error.
delete from public.attempt_answers
where attempt_id = :'attempt_submitted' and question_id = :'q_choice';

select is(
  (select count(*) from public.attempt_answers
   where attempt_id = :'attempt_submitted' and question_id = :'q_choice'),
  1::bigint,
  'deleting an answer on an already-submitted attempt has no effect'
);

-- 2) profiles: email is locked on self-update, other columns still work.
select throws_ok(
  format('update public.profiles set email = %L where id = %L::uuid',
    'hacked@test.local', :'student_a'),
  '42501'
);

select lives_ok(
  format('update public.profiles set full_name = %L where id = %L::uuid',
    'New Name', :'student_a'),
  'updating own full_name is still allowed'
);

select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);

select lives_ok(
  format('update public.profiles set email = %L where id = %L::uuid',
    'staff-set@test.local', :'student_a'),
  'staff can still update another user''s email'
);

-- 3) storage: students only see published content; staff sees everything.
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

select is(
  (select count(*) from storage.objects where bucket_id = 'videos' and name = 'videos/pub.mp4'),
  1::bigint, 'student can see a published video object');
select is(
  (select count(*) from storage.objects where bucket_id = 'videos' and name = 'videos/unpub.mp4'),
  0::bigint, 'student cannot see an unpublished video object');
select is(
  (select count(*) from storage.objects where bucket_id = 'question-images' and name = 'qimg/pub.png'),
  1::bigint, 'student can see an image for a published exam''s question');
select is(
  (select count(*) from storage.objects where bucket_id = 'question-images' and name = 'qimg/unpub.png'),
  0::bigint, 'student cannot see an image for an unpublished exam''s question');

select set_config('request.jwt.claims', json_build_object('sub', :'admin_user')::text, true);

select is(
  (select count(*) from storage.objects where bucket_id = 'videos' and name = 'videos/unpub.mp4'),
  1::bigint, 'staff can see an unpublished video object');
select is(
  (select count(*) from storage.objects where bucket_id = 'question-images' and name = 'qimg/unpub.png'),
  1::bigint, 'staff can see an image for an unpublished exam''s question');

select * from finish();
rollback;
