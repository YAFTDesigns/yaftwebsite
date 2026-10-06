-- Visitor summary for the admin Overview.
-- One "visitor" = one browser (session_id is stored in localStorage by the
-- site's own tracker). "New" = that browser's first-ever event falls inside
-- the window; "returning" = active in the window but first seen earlier.
-- Internal/team traffic (is_internal) is excluded. Day boundaries use IST.
-- Service role only.
create or replace function public.admin_visitor_summary()
returns jsonb
language sql
stable
set search_path = public
as $$
with ev as (
  select session_id, created_at, event_type, page, referrer, utm_source
  from analytics_events
  where not coalesce(is_internal, false)
    and session_id is not null and session_id <> 'no-storage'
    and created_at > now() - interval '400 days'
),
first_ev as (
  select distinct on (session_id) session_id, created_at as first_at, referrer, utm_source
  from ev order by session_id, created_at
),
w(label, start_at) as (
  values
    ('today', (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata'),
    ('7d', now() - interval '7 days'),
    ('30d', now() - interval '30 days')
),
wins as (
  select w.label,
    (select count(*) from first_ev f where f.first_at >= w.start_at) as new_visitors,
    (select count(distinct e.session_id) from ev e where e.created_at >= w.start_at) as active,
    (select count(*) from ev e where e.event_type = 'page_view' and e.created_at >= w.start_at) as page_views
  from w
),
src as (
  select
    case
      when nullif(utm_source, '') is not null then lower(utm_source)
      when referrer is null or referrer = '' or referrer ilike '%yaftdesigns.com%' then 'Direct'
      else regexp_replace(substring(referrer from '://([^/]+)'), '^www\.', '')
    end as source,
    count(*) as visitors
  from first_ev
  where first_at >= now() - interval '30 days'
  group by 1 order by 2 desc limit 6
),
pg as (
  select page, count(*) as views
  from ev
  where event_type = 'page_view' and created_at >= now() - interval '7 days' and page is not null
  group by 1 order by 2 desc limit 6
)
select jsonb_build_object(
  'windows', (select jsonb_agg(jsonb_build_object(
      'label', label, 'new', new_visitors, 'returning', greatest(active - new_visitors, 0), 'views', page_views)
      order by case label when 'today' then 1 when '7d' then 2 else 3 end) from wins),
  'sources', coalesce((select jsonb_agg(jsonb_build_object('source', source, 'visitors', visitors) order by visitors desc) from src), '[]'::jsonb),
  'pages', coalesce((select jsonb_agg(jsonb_build_object('page', page, 'views', views) order by views desc) from pg), '[]'::jsonb)
);
$$;

revoke all on function public.admin_visitor_summary() from public, anon, authenticated;
grant execute on function public.admin_visitor_summary() to service_role;
