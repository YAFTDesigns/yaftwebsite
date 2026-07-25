-- The admin Analytics page was pulling up to 20,000 raw rows from
-- analytics_events and syllabus_requests into JS and counting them
-- there. Two problems with that:
--
-- 1. The 20,000 cap is silent -- once real traffic crosses it, the
--    funnel numbers quietly become wrong with no indication anything
--    was truncated.
-- 2. The "funnel" counted raw event rows, not distinct sessions, so
--    a single visitor refreshing a page repeatedly inflates that
--    step's count and skews the whole chart.
--
-- Both are fixed by aggregating in Postgres instead: these views
-- return one row per event_type / course_slug, so page size no
-- longer depends on total traffic volume, and the funnel counts
-- DISTINCT sessions per step rather than raw event rows.

create or replace view public.analytics_funnel_counts as
select event_type, count(distinct session_id) as sessions
from public.analytics_events
group by event_type;

create or replace view public.syllabus_requests_by_course as
select course_slug, count(*) as requests
from public.syllabus_requests
group by course_slug;
