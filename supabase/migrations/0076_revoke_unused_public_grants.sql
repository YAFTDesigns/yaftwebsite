-- Defence in depth (audit F8). These tables have RLS on and no policies, so anon/authenticated
-- were already blocked; the server uses the service role. Remove the unused grants so one
-- mistaken policy later cannot expose them. Tables with public read policies are untouched.
do $$
declare t text;
begin
  foreach t in array array[
    'analytics_events','bd_leads','certificate_verifications','certificates','clients','cron_job_controls',
    'email_logs','email_templates','enquiries','integration_tokens','invoice_logs','invoices','job_status_events',
    'jobs','lab_categories','lab_scripts','lead_notes','lead_sessions','leads','push_subscriptions',
    'service_images','syllabus_requests','team_members','tortoise_activations','tortoise_licenses','tortoise_payments'
  ] loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;
