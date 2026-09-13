-- pgTAP tests for public.submit_exam_attempt(): choice/text grading, fuzzy
-- matching on/off, score/pass computation, resubmission, and ownership.
-- Run with: supabase test db

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as the superuser test role, bypassing RLS)
-- ---------------------------------------------------------------------------
select gen_random_uuid() as student_a \gset
select gen_random_uuid() as student_b \gset
select gen_random_uuid() as course1 \gset
select gen_random_uuid() as exam1 \gset
select gen_random_uuid() as exam2 \gset
select gen_random_uuid() as exam3 \gset
select gen_random_uuid() as q_choice \gset
select gen_random_uuid() as q_text \gset
select gen_random_uuid() as q_text2 \gset
select gen_random_uuid() as q_choice3 \gset
select gen_random_uuid() as choice_correct \gset
select gen_random_uuid() as choice_wrong \gset
select gen_random_uuid() as choice3_correct \gset
select gen_random_uuid() as attempt1 \gset
select gen_random_uuid() as attempt2 \gset
select gen_random_uuid() as attempt3 \gset
select gen_random_uuid() as attempt6 \gset

-- auth.users insert fires handle_new_user(), which creates the matching profile.
insert into auth.users (id, email) values
  (:'student_a', 'student-a@test.local'),
  (:'student_b', 'student-b@test.local');

insert into public.courses (id, slug, title, is_published)
values (:'course1', 'ci-course-1', 'CI Course 1', true);

-- exam1: fuzzy matching on, passing_score 50.
-- exam2: fuzzy matching off, passing_score 50 (isolates the fuzzy-off case).
-- exam3: passing_score null (isolates the "no pass/fail" case).
insert into public.exams (id, course_id, slug, title, passing_score, is_published, fuzzy_matching)
values
  (:'exam1', :'course1', 'ci-exam-1', 'CI Exam 1', 50, true, true),
  (:'exam2', :'course1', 'ci-exam-2', 'CI Exam 2', 50, true, false),
  (:'exam3', :'course1', 'ci-exam-3', 'CI Exam 3', null, true, true);

insert into public.questions (id, exam_id, stem, points, position, kind)
values
  (:'q_choice',  :'exam1', 'Pick the correct one', 1, 0, 'choice'),
  (:'q_text',    :'exam1', 'Name the structure',   1, 1, 'text'),
  (:'q_text2',   :'exam2', 'Name the structure',   1, 0, 'text'),
  (:'q_choice3', :'exam3', 'Pick the correct one', 1, 0, 'choice');

insert into public.choices (id, question_id, body, is_correct, position)
values
  (:'choice_correct',  :'q_choice',  'Correct', true,  0),
  (:'choice_wrong',    :'q_choice',  'Wrong',   false, 1),
  (:'choice3_correct', :'q_choice3', 'Correct', true,  0);

-- Answer key length 9 -> fuzzy_tolerance() = 1 (see fuzzy_and_reveal.sql).
insert into public.answer_keys (question_id, answer)
values (:'q_text', 'diaphragm'), (:'q_text2', 'diaphragm');

-- attempt1 (exam1, student A): both answers correct, one via exact match.
insert into public.exam_attempts (id, exam_id, user_id) values (:'attempt1', :'exam1', :'student_a');
insert into public.attempt_answers (attempt_id, question_id, choice_id)
values (:'attempt1', :'q_choice', :'choice_correct');
insert into public.attempt_answers (attempt_id, question_id, text_answer)
values (:'attempt1', :'q_text', 'diaphragm');

-- attempt2 (exam1, student A): wrong choice, text answer is a 1-edit typo
-- ("diaphram", missing the g) -> within tolerance 1, fuzzy matching is on.
insert into public.exam_attempts (id, exam_id, user_id) values (:'attempt2', :'exam1', :'student_a');
insert into public.attempt_answers (attempt_id, question_id, choice_id)
values (:'attempt2', :'q_choice', :'choice_wrong');
insert into public.attempt_answers (attempt_id, question_id, text_answer)
values (:'attempt2', :'q_text', 'diaphram');

-- attempt3 (exam2, student A): same 1-edit typo, but exam2 has fuzzy matching off.
insert into public.exam_attempts (id, exam_id, user_id) values (:'attempt3', :'exam2', :'student_a');
insert into public.attempt_answers (attempt_id, question_id, text_answer)
values (:'attempt3', :'q_text2', 'diaphram');

-- attempt6 (exam3, student A): correct choice, exam has no passing_score.
insert into public.exam_attempts (id, exam_id, user_id) values (:'attempt6', :'exam3', :'student_a');
insert into public.attempt_answers (attempt_id, question_id, choice_id)
values (:'attempt6', :'q_choice3', :'choice3_correct');

-- ---------------------------------------------------------------------------
-- Assertions: impersonate student A via the JWT claim the RLS/RPC layer reads.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);

select public.submit_exam_attempt(:'attempt1');

select is(
  (select is_correct from public.attempt_answers where attempt_id = :'attempt1' and question_id = :'q_choice'),
  true, 'attempt1: correct choice is graded correct');
select is(
  (select is_correct from public.attempt_answers where attempt_id = :'attempt1' and question_id = :'q_text'),
  true, 'attempt1: exact text match is graded correct');
select is(
  (select score from public.exam_attempts where id = :'attempt1'),
  100.00, 'attempt1: score is 100 when everything is correct');
select is(
  (select passed from public.exam_attempts where id = :'attempt1'),
  true, 'attempt1: passed is true when score >= passing_score');

select public.submit_exam_attempt(:'attempt2');

select is(
  (select is_correct from public.attempt_answers where attempt_id = :'attempt2' and question_id = :'q_choice'),
  false, 'attempt2: wrong choice is graded incorrect');
select is(
  (select is_correct from public.attempt_answers where attempt_id = :'attempt2' and question_id = :'q_text'),
  true, 'attempt2: 1-edit typo within tolerance is graded correct when fuzzy matching is on');
select is(
  (select score from public.exam_attempts where id = :'attempt2'),
  50.00, 'attempt2: score reflects exactly one of two questions correct');
select is(
  (select passed from public.exam_attempts where id = :'attempt2'),
  true, 'attempt2: passed is true at exactly the passing score');

select public.submit_exam_attempt(:'attempt3');

select is(
  (select is_correct from public.attempt_answers where attempt_id = :'attempt3' and question_id = :'q_text2'),
  false, 'attempt3: same typo is graded incorrect when fuzzy matching is off');
select is(
  (select passed from public.exam_attempts where id = :'attempt3'),
  false, 'attempt3: passed is false when below passing_score');

select throws_ok(
  format('select public.submit_exam_attempt(%L::uuid)', :'attempt1'),
  'P0001',
  'attempt already submitted',
  'resubmitting an already-submitted attempt is rejected'
);

select set_config('request.jwt.claims', json_build_object('sub', :'student_b')::text, true);

select throws_ok(
  format('select public.submit_exam_attempt(%L::uuid)', :'attempt1'),
  'P0002',
  'attempt not found',
  'submitting another user''s attempt is rejected'
);

select set_config('request.jwt.claims', json_build_object('sub', :'student_a')::text, true);
select public.submit_exam_attempt(:'attempt6');

select is(
  (select passed from public.exam_attempts where id = :'attempt6'),
  null, 'attempt6: passed is null when the exam has no passing_score');
select is(
  (select score from public.exam_attempts where id = :'attempt6'),
  100.00, 'attempt6: score is still computed when there is no passing_score');

select * from finish();
rollback;
