-- The invoices table had three RLS policies (insert, update, select)
-- with USING(true)/WITH CHECK(true) and no role restriction, meaning
-- they applied to PUBLIC, not just service_role. Every real touch of
-- this table already goes through server-side routes using the
-- service-role client (which bypasses RLS regardless of policy), so
-- these policies had zero legitimate purpose and were pure exposure:
-- since the Supabase anon key is public by design (shipped in every
-- page load), anyone could have extracted it and called the Supabase
-- REST API directly to read, insert, or modify invoice records,
-- completely bypassing the app's own API layer.
--
-- Dropping them. service_role already bypasses RLS entirely, so no
-- replacement policy is needed for the app to keep working.

drop policy if exists "invoices admin insert" on public.invoices;
drop policy if exists "invoices admin update" on public.invoices;
drop policy if exists "invoices admin select" on public.invoices;
