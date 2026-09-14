-- pgTAP tests for the study streak feature: public.get_my_streak() and the
-- triggers that populate public.user_activity from video_progress /
-- exam_attempts. Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as the superuser test role, bypassing RLS)
-- ---------------------------------------------------------------------------
select gen_random_uuid() as student_a \gset
select gen_random_uuid() as student_b \gset
select gen_random_uuid() as student_c \gset
select gen_random_uuid() as student_d \gset
select gen_random_uuid() as student_e \gset
select gen_random_uuid() as course1 \gset
select gen_random_uuid() as video1 \gset
select gen_random_uuid() as video2 \gset
select gen_random_uuid() as exam1 \gset
select gen_random_uuid() as attempt_e \gset

insert into auth.users (id, email) values
  (:'student_a', 'streak-a@test.local'),
  (:'student_b', 'streak-b@test.local'),
  (:'student_c', 'streak-c@test.local'),
  (:'student_d', 'streak-d@test.local'),
  (:'student_e', 'streak-e@test.local');

insert into public.courses (id, slug, title, is_published)
values (:'course1', 'ci-streak-course', 'CI Streak Course', true);

insert into public.videos (id, course_id, title, external_url, is_published)
values
  (:'video1', :'course1', 'Video 1', 'https://example.com/v1', true),
  (:'video2', :'course1', 'Video 2', 'https://example.com/v2', true);

insert into public.exams (id, course_id, slug, title, is_published)
values (:'exam1', :'course1', 'ci-streak-exam', 'CI Streak Exam', true);

-- student_a: run of 3 days ending 3 days ago, gap, then yesterday + today
-- -> current streak 2, longest streak 3.
insert into public.user_activity (user_id, activity_date) values
  (:'student_a', (now() at time zone 'Asia/Bangkok')::date - 5),
  (:'student_a', (now() at time zone 'Asia/Bangkok')::date - 4),
  (:'student_a', (now() at time zone 'Asia/Bangkok')::date - 3),
  (:'student_a', (now() at time zone 'Asia/Bangkok')::date - 1),
  (:'student_a', (now() at time zone 'Asia/Bangkok')::date);

-- student_b: single day, 3 days ago, nothing since -> streak has lapsed.
insert into public.user_activity (user_id, activity_date)
values (:'student_b', (now() at time zone 'Asia/Bangkok')::date - 3);

-- student_c: no activity at all.

-- ---------------------------------------------------------------------------
-- get_my_streak(): impersonate each student via the JWT claim it reads.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

select is(
  (select current_streak from public.get_my_streak()),
  2, 'student_a: current streak counts yesterday + today');
select is(
  (select longest_streak from public.get_my_streak()),
  3, 'student_a: longest streak is the earlier 3-day run');
select is(
  (select last_active_date from public.get_my_streak()),
  (now() at time zone 'Asia/Bangkok')::date, 'student_a: last active today');

select is(
  (select count(*) from public.user_activity where user_id = :'student_b')::integer,
  0, 'student_a cannot see student_b''s activity rows via RLS');

select throws_ok(
  format('insert into public.user_activity (user_id, activity_date) values (%L::uuid, current_date)', :'student_a'),
  '42501',
  'permission denied for table user_activity',
  'students cannot insert into user_activity directly (no grant, only the trigger can write)'
);

select set_config('request.jwt.claims', json_build_object('sub', :'student_b')::text, true);

select is(
  (select current_streak from public.get_my_streak()),
  0, 'student_b: streak lapsed (last active 3 days ago)');
select is(
  (select longest_streak from public.get_my_streak()),
  1, 'student_b: longest streak is still recorded as 1');
select is(
  (select last_active_date from public.get_my_streak()),
  (now() at time zone 'Asia/Bangkok')::date - 3, 'student_b: last active date is preserved');

select set_config('request.jwt.claims', json_build_object('sub', :'student_c')::text, true);

select is(
  (select current_streak from public.get_my_streak()),
  0, 'student_c: no activity means zero current streak');
select is(
  (select longest_streak from public.get_my_streak()),
  0, 'student_c: no activity means zero longest streak');
select is(
  (select last_active_date from public.get_my_streak()),
  null::date, 'student_c: no activity means no last_active_date');

-- ---------------------------------------------------------------------------
-- Triggers: real student actions should record today's activity.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', :'student_d')::text, true);

insert into public.video_progress (user_id, video_id, seconds_watched)
values (:'student_d', :'video1', 30);

select is(
  (select count(*) from public.user_activity
   where user_id = :'student_d' and activity_date = (now() at time zone 'Asia/Bangkok')::date)::integer,
  1, 'watching a video records today''s activity for student_d');

insert into public.video_progress (user_id, video_id, seconds_watched)
values (:'student_d', :'video2', 15);

select is(
  (select count(*) from public.user_activity where user_id = :'student_d')::integer,
  1, 'a second video the same day does not duplicate the activity row');

select set_config('request.jwt.claims', json_build_object('sub', :'student_e')::text, true);

insert into public.exam_attempts (id, exam_id, user_id) values (:'attempt_e', :'exam1', :'student_e');

select is(
  (select count(*) from public.user_activity
   where user_id = :'student_e' and activity_date = (now() at time zone 'Asia/Bangkok')::date)::integer,
  1, 'starting an exam attempt records today''s activity for student_e');

select * from finish();
rollback;
