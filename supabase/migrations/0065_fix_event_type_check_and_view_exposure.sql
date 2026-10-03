-- 1. analytics_events rejected lab_script_view, lab_script_download and cta_click
--    (check constraint 23514), so those events were silently dropped.
alter table public.analytics_events drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events add constraint analytics_events_event_type_check
  check (event_type = any (array[
    'page_view','syllabus_modal_open','syllabus_unlock','enquiry_submit',
    'course_gate_open','course_gate_unlock','whatsapp_gate_open','whatsapp_click',
    'lab_script_view','lab_script_download','cta_click'
  ]::text[]));

-- 2. Two older admin-only views were SECURITY DEFINER and readable by the public
--    anon/authenticated roles. Only the server (service role) reads them.
alter view public.lead_time_on_site set (security_invoker = true);
alter view public.analytics_monthly_event_counts set (security_invoker = true);
revoke all on public.lead_time_on_site from anon, authenticated;
revoke all on public.analytics_monthly_event_counts from anon, authenticated;
