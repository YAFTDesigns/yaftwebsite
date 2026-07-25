-- analytics_funnel_counts and syllabus_requests_by_course (0025) were
-- created as plain views, which in Postgres default to running with
-- the view creator's privileges (effectively SECURITY DEFINER),
-- bypassing RLS for whoever queries them. Since these views are only
-- ever queried through the service-role client, which bypasses RLS
-- regardless, there's no live exploit path today -- but it's the
-- wrong default to leave in place. Setting security_invoker = true
-- makes the view run with the querying user's own permissions and
-- RLS instead of the creator's, closing the gap for good regardless
-- of how these views get queried in the future.

alter view public.analytics_funnel_counts set (security_invoker = true);
alter view public.syllabus_requests_by_course set (security_invoker = true);
