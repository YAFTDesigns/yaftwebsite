-- Marketing requests 1, 2, 3, 5:
--  * enquiries.segment (individual | college | corporate), nullable so
--    pre-existing rows stay "unknown" rather than being guessed.
--  * enquiries.phone, optional, free text capped at 30 chars.
--  * Two aggregate views for the admin service-journey report. Both are
--    security_invoker and not readable by anon/authenticated (admin pages
--    use the service role).
-- Internal traffic (is_internal) and /admin pages are excluded.

alter table public.enquiries
  add column if not exists segment text check (segment in ('individual', 'college', 'corporate')),
  add column if not exists phone text check (char_length(phone) <= 30);

create index if not exists idx_enquiries_segment on public.enquiries(segment);

create or replace view public.service_journey_events
with (security_invoker = true) as
with ev as (
  select * from public.analytics_events
  where coalesce(is_internal, false) = false and coalesce(page, '') not like '/admin%'
)
select 'course_viewed'::text as stage, substring(page from '^/courses/([a-z0-9-]+)$') as key, count(distinct session_id) as sessions
  from ev where event_type = 'page_view' and page ~ '^/courses/[a-z0-9-]+$' group by 2
union all
select 'gate_open', course_slug, count(distinct session_id)
  from ev where event_type = 'course_gate_open' and course_slug is not null group by 2
union all
select 'unlocked', course_slug, count(distinct session_id)
  from ev where event_type = 'course_gate_unlock' and course_slug is not null group by 2
union all
select 'services_page_viewed', '/services', count(distinct session_id)
  from ev where event_type = 'page_view' and page = '/services'
union all
select 'cta_click', meta->>'service', count(distinct session_id)
  from ev where event_type = 'cta_click' and meta->>'service' is not null group by 2;

create or replace view public.enquiry_interest_segment_counts
with (security_invoker = true) as
select coalesce(course_interest, '(none)') as course_interest,
       coalesce(segment, 'unknown') as segment,
       count(*) as enquiries
from public.enquiries
group by 1, 2;

revoke all on public.service_journey_events from anon, authenticated;
revoke all on public.enquiry_interest_segment_counts from anon, authenticated;
