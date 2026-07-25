-- No way to tell organic search from direct/social/referral traffic
-- until now -- analytics_events had no referrer or UTM capture at
-- all. Adding first-touch attribution: captured once per session at
-- session creation (not on every page_view, which would overwrite
-- the true original referrer with yaftdesigns.com itself on internal
-- navigation) and carried on every event row for that session.

alter table public.analytics_events
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

-- One row per session (first-touch, since referrer/utm are captured
-- once at session start and carried on every event for that session),
-- classified into a readable source bucket and counted.
create or replace view public.analytics_traffic_sources
with (security_invoker = true) as
with first_touch as (
  select distinct on (session_id) session_id, referrer, utm_source
  from public.analytics_events
  order by session_id, created_at asc
)
select
  case
    when utm_source is not null then 'Campaign'
    when referrer is null or referrer = '' then 'Direct'
    when referrer ilike '%google%' or referrer ilike '%bing%' or referrer ilike '%yahoo%' or referrer ilike '%duckduckgo%' then 'Organic search'
    when referrer ilike '%facebook%' or referrer ilike '%instagram%' or referrer ilike '%linkedin%' or referrer ilike '%twitter%' or referrer ilike '%x.com%' or referrer ilike '%youtube%' then 'Social'
    else 'Referral'
  end as source,
  count(*) as sessions
from first_touch
group by 1;
