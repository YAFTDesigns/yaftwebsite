-- No way to distinguish the founder's own testing traffic from real
-- visitors in any analytics data, which made every engagement/exit
-- number reported so far untrustworthy as a measure of real visitor
-- behavior. Adding a persistent, opt-in "this browser is internal"
-- flag (set once via a URL, see lib/analytics.ts) so future traffic
-- can be excluded from reporting.

alter table public.analytics_events
  add column if not exists is_internal boolean not null default false;

create index if not exists analytics_events_is_internal_idx on public.analytics_events(is_internal) where is_internal;

-- Recreate the two existing aggregate views to exclude internal traffic.
create or replace view public.analytics_funnel_counts
with (security_invoker = true) as
select event_type, count(distinct session_id) as sessions
from public.analytics_events
where not is_internal
group by event_type;

create or replace view public.analytics_traffic_sources
with (security_invoker = true) as
with first_touch as (
  select distinct on (session_id) session_id, referrer, utm_source
  from public.analytics_events
  where not is_internal
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
