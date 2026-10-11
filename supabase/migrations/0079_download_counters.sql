-- Public "downloads so far" number for the Tortoise free trial. Counter only, no visitor data stored.
create table if not exists public.download_counters (
  key text primary key,
  count bigint not null default 0
);
alter table public.download_counters enable row level security;
revoke all on table public.download_counters from anon, authenticated;

create or replace function public.bump_download(p_key text)
returns bigint
language sql
set search_path = public
as $$
  insert into public.download_counters as d (key, count) values (p_key, 1)
  on conflict (key) do update set count = d.count + 1
  returning count;
$$;
revoke all on function public.bump_download(text) from public, anon, authenticated;
grant execute on function public.bump_download(text) to service_role;
