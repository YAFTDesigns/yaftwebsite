-- Audit F5: the licence check counted PCs and then inserted, so a burst of requests with
-- different machine ids could exceed max_machines. Do it in one transaction, serialised per key.
create or replace function public.tortoise_activate(p_key text, p_machine text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  lic public.tortoise_licenses%rowtype;
  n int;
begin
  select * into lic from public.tortoise_licenses where key = p_key for update;
  if not found then return jsonb_build_object('result','not_found'); end if;
  if lic.status <> 'active' then return jsonb_build_object('result','revoked'); end if;
  if lic.expires_at is not null and lic.expires_at < now() then
    return jsonb_build_object('result','expired');
  end if;
  if exists (select 1 from public.tortoise_activations where key = p_key and machine = p_machine) then
    update public.tortoise_activations set last_seen = now() where key = p_key and machine = p_machine;
    return jsonb_build_object('result','ok','expires_at',lic.expires_at);
  end if;
  select count(*) into n from public.tortoise_activations where key = p_key;
  if n >= lic.max_machines then
    return jsonb_build_object('result','limit','max_machines',lic.max_machines);
  end if;
  insert into public.tortoise_activations (key, machine, last_seen) values (p_key, p_machine, now());
  return jsonb_build_object('result','ok','expires_at',lic.expires_at);
end $$;
revoke all on function public.tortoise_activate(text, text) from public, anon, authenticated;
grant execute on function public.tortoise_activate(text, text) to service_role;
