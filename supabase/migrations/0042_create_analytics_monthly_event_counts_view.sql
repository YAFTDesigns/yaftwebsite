-- Same bug class as 0041 (lead_time_on_site), found by auditing for
-- it directly after fixing that one: the 6-month trend charts on
-- /admin/analytics fetched raw analytics_events rows (event_type,
-- created_at) for a 6-month window with no limit, then bucketed them
-- into months in JS. Confirmed via direct count that this window
-- currently returns 2,481 rows -- 2.5x over Supabase/PostgREST's
-- default 1000-row cap -- meaning the trend charts were silently
-- showing undercounted, truncated numbers from the moment they
-- shipped, not a future risk.
--
-- Aggregating at the database level instead: one row per
-- (month, event_type) pair rather than one row per tracked event, so
-- the row cap can't realistically be hit the way raw-row fetching
-- inevitably would as analytics_events keeps growing.
create or replace view analytics_monthly_event_counts as
select
  to_char(created_at, 'YYYY-MM') as month,
  event_type,
  count(*) as events
from analytics_events
where not is_internal
group by month, event_type;
