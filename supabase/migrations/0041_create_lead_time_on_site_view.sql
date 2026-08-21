-- Fixes a real bug on /admin/leads: "Time on site" was computed by
-- fetching ALL raw analytics_events rows tagged with a lead_id (1217
-- rows and growing) with no aggregation, ordered oldest-first with no
-- explicit limit. Supabase/PostgREST's default row cap is 1000, so
-- the newest ~217 events -- everything from roughly the last two
-- weeks, including live leads like the Al Abbar Group enquiry -- were
-- silently dropped, showing "No data yet" despite the data genuinely
-- existing. Older leads worked fine since their events fell within
-- the first 1000 rows; this is exactly why the bug looked like a
-- clean date cutoff rather than random noise.
--
-- Aggregating at the database level instead of pulling raw rows: this
-- view returns at most one row per lead_id (currently 13, growing by
-- one per newly-identified lead, never by one per page view), so the
-- row cap can't realistically be hit again the way raw-row fetching
-- inevitably would as analytics_events keeps growing.
create or replace view lead_time_on_site as
select
  lead_id,
  min(created_at) as first_event,
  max(created_at) as last_event,
  count(*) as event_count
from analytics_events
where lead_id is not null
group by lead_id;
