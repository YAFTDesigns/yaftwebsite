-- The standalone yaft-jobs-admin app (a separate, unauthenticated Vercel
-- deployment) had public anon-role SELECT/INSERT/UPDATE policies on both
-- tables so its client-side code could talk to Supabase directly with no
-- login. That meant anyone with the public anon key could read or write
-- client PII and job financials. Every other admin-only table in this DB
-- (leads, enquiries, invoices, analytics_events) has zero public policies;
-- admin API routes use the service-role client exclusively. Matching that
-- convention here now that jobs/clients are being integrated into the
-- real, authenticated admin panel.
drop policy if exists anon_select_jobs on jobs;
drop policy if exists anon_insert_jobs on jobs;
drop policy if exists anon_update_jobs on jobs;
drop policy if exists anon_select_clients on clients;
drop policy if exists anon_insert_clients on clients;
drop policy if exists anon_update_clients on clients;
