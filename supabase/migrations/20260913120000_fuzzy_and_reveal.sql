-- 1) Fuzzy matching for typed answers (Levenshtein, tolerance scaled by length)
-- 2) Per-exam switch to reveal answers after submission
-- 3) get_attempt_review(): the only way students can see answer keys —
--    their own attempt, already submitted, exam allows reveal.

create extension if not exists fuzzystrmatch with schema extensions;

alter table public.exams
  add column reveal_answers boolean not null default true,
  add column fuzzy_matching boolean not null default true;

-- Allowed edit distance for a normalised key: short medical terms stay strict
-- (ileum/ilium), longer ones tolerate a slip or two (choncha → concha).
create or replace function public.fuzzy_tolerance(p_norm_key text)
returns integer
language sql
immutable
as $$
  select case
    when length(p_norm_key) < 6  then 0
    when length(p_norm_key) < 12 then 1
    else 2
  end;
$$;

create or replace function public.answer_distance(p_key text, p_answer text)
returns integer
language sql
immutable
as $$
  select extensions.levenshtein(
    left(public.normalize_answer(p_key), 255),
    left(public.normalize_answer(p_answer), 255));
$$;

create or replace function public.text_answer_matches(p_question_id uuid, p_answer text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.normalize_answer(p_answer) <> ''
     and exists (
       select 1
       from public.answer_keys k
       join public.questions q on q.id = k.question_id
       join public.exams e on e.id = q.exam_id
       where k.question_id = p_question_id
         and (
           public.normalize_answer(k.answer) = public.normalize_answer(p_answer)
           or (e.fuzzy_matching
               and public.answer_distance(k.answer, p_answer)
                   <= public.fuzzy_tolerance(public.normalize_answer(k.answer)))
         )
     );
$$;
-- Internal helper: not callable by clients (would leak key proximity).
revoke execute on function public.text_answer_matches(uuid, text) from public, anon, authenticated;

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

  update public.attempt_answers a
  set is_correct = case q.kind
    when 'choice' then exists (
      select 1 from public.choices c where c.id = a.choice_id and c.is_correct)
    when 'text' then public.text_answer_matches(q.id, a.text_answer)
    else false end
  from public.questions q
  where a.attempt_id = p_attempt_id and q.id = a.question_id;

  select coalesce(sum(q.points), 0) into v_total
  from public.questions q where q.exam_id = v_attempt.exam_id;

  select coalesce(sum(q.points), 0) into v_earned
  from public.attempt_answers a
  join public.questions q on q.id = a.question_id
  where a.attempt_id = p_attempt_id and a.is_correct;

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

-- Post-submission review. Returns nothing for students when the exam hides answers.
create or replace function public.get_attempt_review(p_attempt_id uuid)
returns table (
  question_id       uuid,
  correct_choice_id uuid,
  accepted_answers  text[],
  closest_answer    text,
  distance          integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_attempt public.exam_attempts;
  v_reveal  boolean;
begin
  select * into v_attempt from public.exam_attempts where id = p_attempt_id;
  if v_attempt.id is null or (v_attempt.user_id <> auth.uid() and not public.is_staff()) then
    raise exception 'attempt not found' using errcode = 'P0002';
  end if;
  if v_attempt.submitted_at is null then
    raise exception 'attempt not submitted' using errcode = 'P0001';
  end if;
  select e.reveal_answers into v_reveal from public.exams e where e.id = v_attempt.exam_id;
  if not v_reveal and not public.is_staff() then
    return;
  end if;

  return query
    select
      q.id,
      (select c.id from public.choices c
         where c.question_id = q.id and c.is_correct order by c.position limit 1),
      (select array_agg(k.answer order by k.position) from public.answer_keys k
         where k.question_id = q.id),
      (select k.answer from public.answer_keys k
         where k.question_id = q.id
         order by public.answer_distance(k.answer, a.text_answer), k.position limit 1),
      (select min(public.answer_distance(k.answer, a.text_answer)) from public.answer_keys k
         where k.question_id = q.id)
    from public.questions q
    left join public.attempt_answers a on a.attempt_id = p_attempt_id and a.question_id = q.id
    where q.exam_id = v_attempt.exam_id
    order by q.position;
end;
$$;

grant execute on function public.get_attempt_review(uuid) to authenticated;
