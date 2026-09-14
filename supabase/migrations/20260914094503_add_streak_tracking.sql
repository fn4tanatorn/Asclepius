-- Study streak tracking: how many days in a row a student has watched a
-- video or attempted an exam.
--
-- public.user_activity records one row per (user, calendar day in
-- Asia/Bangkok) they did something trackable. It's populated only by
-- triggers on video_progress and exam_attempts (security definer, so they
-- bypass RLS the same way submit_exam_attempt() does) -- students have no
-- direct write policy on it, so they can't pad their own streak.

create table public.user_activity (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index user_activity_user_id_idx on public.user_activity (user_id);

create or replace function public.record_user_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity (user_id, activity_date)
  values (new.user_id, (now() at time zone 'Asia/Bangkok')::date)
  on conflict (user_id, activity_date) do nothing;
  return new;
end;
$$;

create trigger video_progress_record_activity
  after insert or update on public.video_progress
  for each row execute function public.record_user_activity();

create trigger exam_attempts_record_activity
  after insert on public.exam_attempts
  for each row execute function public.record_user_activity();

-- Current/longest consecutive-day streak for the calling user. A streak
-- that ended yesterday still counts as "current" (not broken until a full
-- day passes with no activity); one that ended before yesterday is 0.
create or replace function public.get_my_streak()
returns table (current_streak integer, longest_streak integer, last_active_date date)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_today       date := (now() at time zone 'Asia/Bangkok')::date;
  v_last_active date;
  v_run         integer := 0;
  v_longest     integer := 0;
  v_prev        date;
  r             record;
begin
  for r in
    select ua.activity_date
    from public.user_activity ua
    where ua.user_id = auth.uid()
    order by ua.activity_date
  loop
    if v_prev is null or r.activity_date = v_prev + 1 then
      v_run := v_run + 1;
    else
      v_run := 1;
    end if;
    if v_run > v_longest then
      v_longest := v_run;
    end if;
    v_prev := r.activity_date;
  end loop;

  v_last_active := v_prev;

  return query select
    case when v_last_active is not null and v_last_active >= v_today - 1
      then v_run else 0 end,
    v_longest,
    v_last_active;
end;
$$;

alter table public.user_activity enable row level security;

create policy "user_activity: read own or staff reads all"
  on public.user_activity for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

grant select on public.user_activity to authenticated;
grant execute on function public.get_my_streak() to authenticated;
