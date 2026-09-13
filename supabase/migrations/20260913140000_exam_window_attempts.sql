-- Per-exam availability window and attempt limit, enforced in RLS so the
-- rule holds even if someone calls PostgREST directly.

alter table public.exams
  add column max_attempts integer check (max_attempts is null or max_attempts > 0),
  add column opens_at     timestamptz,
  add column closes_at    timestamptz,
  add constraint exams_window_check check (opens_at is null or closes_at is null or closes_at > opens_at);

create or replace function public.exam_is_open(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and e.is_published
      and (e.opens_at  is null or e.opens_at  <= now())
      and (e.closes_at is null or e.closes_at >  now())
  );
$$;
grant execute on function public.exam_is_open(uuid) to authenticated;

-- Students may start an attempt only while the exam is open and under the limit.
drop policy "exam_attempts: start own on published exam" on public.exam_attempts;
create policy "exam_attempts: start own within window and limit"
  on public.exam_attempts for insert to authenticated
  with check (
    user_id = auth.uid()
    and submitted_at is null and score is null and passed is null
    and public.exam_is_open(exam_id)
    and (
      select count(*) from public.exam_attempts a
      where a.exam_id = exam_attempts.exam_id and a.user_id = auth.uid()
    ) < coalesce((select e.max_attempts from public.exams e where e.id = exam_id), 2147483647)
  );
