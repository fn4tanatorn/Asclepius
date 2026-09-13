-- Store the user's email on profiles so staff pages (results, user management)
-- can show who a row belongs to. auth.users is not readable through PostgREST.

alter table public.profiles add column if not exists email text;

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Keep it in sync on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end;
  return new;
end;
$$;

-- Keep it in sync when the user changes their email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Backfill existing users.
update public.profiles p
set email = u.email,
    full_name = case when coalesce(p.full_name, '') = ''
                     then coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
                     else p.full_name end
from auth.users u
where u.id = p.id;
