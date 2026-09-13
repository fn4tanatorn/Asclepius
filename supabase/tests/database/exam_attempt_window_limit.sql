-- pgTAP tests for the "exam_attempts: start own within window and limit"
-- RLS insert policy: publish state, opens_at/closes_at window, max_attempts.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select gen_random_uuid() as student \gset
select gen_random_uuid() as course1 \gset
select gen_random_uuid() as exam_unpublished \gset
select gen_random_uuid() as exam_not_open_yet \gset
select gen_random_uuid() as exam_closed \gset
select gen_random_uuid() as exam_open \gset
select gen_random_uuid() as exam_at_limit \gset
select gen_random_uuid() as exam_unlimited \gset

insert into auth.users (id, email) values (:'student', 'window-student@test.local');

insert into public.courses (id, slug, title, is_published)
values (:'course1', 'ci-window-course', 'CI Window Course', true);

insert into public.exams (id, course_id, slug, title, is_published, opens_at, closes_at, max_attempts)
values
  (:'exam_unpublished',  :'course1', 'ci-window-unpublished', 'Unpublished', false, null, null, null),
  (:'exam_not_open_yet', :'course1', 'ci-window-future',      'Opens later', true, now() + interval '1 day', null, null),
  (:'exam_closed',       :'course1', 'ci-window-past',        'Already closed', true, null, now() - interval '1 day', null),
  (:'exam_open',         :'course1', 'ci-window-open',        'Open now', true, null, null, null),
  (:'exam_at_limit',     :'course1', 'ci-window-at-limit',    'Max attempts 1', true, null, null, 1),
  (:'exam_unlimited',    :'course1', 'ci-window-unlimited',   'Unlimited attempts', true, null, null, null);

-- Pre-existing attempt so exam_at_limit is already at its cap of 1.
insert into public.exam_attempts (exam_id, user_id) values (:'exam_at_limit', :'student');
insert into public.exam_attempts (exam_id, user_id) values (:'exam_unlimited', :'student');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student')::text, true);

select throws_ok(
  format('insert into public.exam_attempts (exam_id, user_id) values (%L::uuid, %L::uuid)',
    :'exam_unpublished', :'student'),
  '42501',
  'starting an attempt on an unpublished exam is rejected'
);

select throws_ok(
  format('insert into public.exam_attempts (exam_id, user_id) values (%L::uuid, %L::uuid)',
    :'exam_not_open_yet', :'student'),
  '42501',
  'starting an attempt before opens_at is rejected'
);

select throws_ok(
  format('insert into public.exam_attempts (exam_id, user_id) values (%L::uuid, %L::uuid)',
    :'exam_closed', :'student'),
  '42501',
  'starting an attempt after closes_at is rejected'
);

select lives_ok(
  format('insert into public.exam_attempts (exam_id, user_id) values (%L::uuid, %L::uuid)',
    :'exam_open', :'student'),
  'starting an attempt within the open window is allowed'
);

select throws_ok(
  format('insert into public.exam_attempts (exam_id, user_id) values (%L::uuid, %L::uuid)',
    :'exam_at_limit', :'student'),
  '42501',
  'starting an attempt once max_attempts is reached is rejected'
);

select lives_ok(
  format('insert into public.exam_attempts (exam_id, user_id) values (%L::uuid, %L::uuid)',
    :'exam_unlimited', :'student'),
  'starting another attempt is allowed when max_attempts is null'
);

select * from finish();
rollback;
