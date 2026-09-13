-- Image-based "identify" questions with free-text answers.
--
-- questions.kind = 'choice' (existing) | 'text' (student types an answer).
-- questions.image_path: optional image in the private "question-images" bucket.
-- answer_keys: accepted answers for text questions. Staff-only, never readable
-- by students (same rule as choices.is_correct).
-- attempt_answers.text_answer: the student's typed answer.
-- attempt_answers.is_correct: filled in by submit_exam_attempt() at grading time
-- so students get per-question feedback without the key being exposed.

create type public.question_kind as enum ('choice', 'text');

alter table public.questions
  add column kind       public.question_kind not null default 'choice',
  add column image_path text;

create table public.answer_keys (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  answer      text not null check (btrim(answer) <> ''),
  position    integer not null default 0
);
create index answer_keys_question_id_idx on public.answer_keys (question_id, position);

alter table public.answer_keys enable row level security;
create policy "answer_keys: staff only"
  on public.answer_keys for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

alter table public.attempt_answers
  add column text_answer text,
  add column is_correct  boolean;

-- Case/whitespace-insensitive comparison; trailing sentence punctuation ignored.
create or replace function public.normalize_answer(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(lower(btrim(coalesce(p, ''))), '\s+', ' ', 'g'),
           '[.。!?]+$', '');
$$;

-- Re-create grading with support for both kinds and per-answer feedback.
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

  -- Mark each answer right/wrong.
  update public.attempt_answers a
  set is_correct = case q.kind
    when 'choice' then exists (
      select 1 from public.choices c where c.id = a.choice_id and c.is_correct)
    when 'text' then exists (
      select 1 from public.answer_keys k
      where k.question_id = q.id
        and public.normalize_answer(k.answer) = public.normalize_answer(a.text_answer)
        and public.normalize_answer(a.text_answer) <> '')
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

-- Students may write choice_id / text_answer but never is_correct.
-- (RLS grants row access; column-level grant blocks the column.)
revoke insert, update on public.attempt_answers from authenticated;
grant  insert (attempt_id, question_id, choice_id, text_answer, answered_at) on public.attempt_answers to authenticated;
grant  update (choice_id, text_answer, answered_at) on public.attempt_answers to authenticated;

-- Storage: private bucket for question images. Serve via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-images', 'question-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "question-images: authenticated can read"
  on storage.objects for select to authenticated
  using (bucket_id = 'question-images');
create policy "question-images: staff can write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'question-images' and public.is_staff());
create policy "question-images: staff can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'question-images' and public.is_staff());
create policy "question-images: staff can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'question-images' and public.is_staff());
