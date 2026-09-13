-- LINE OpenChat display name so staff can map a Gmail account to the person in the group chat.
alter table public.profiles add column line_name text;
