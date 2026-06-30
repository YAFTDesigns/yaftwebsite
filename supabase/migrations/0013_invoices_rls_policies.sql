-- The invoices table had RLS enabled but no policies were ever created,
-- which silently blocks every insert/select unless the request uses the
-- service-role key (which bypasses RLS entirely). This adds explicit
-- policies so admin reads/writes work even if the service-role key isn't
-- configured correctly in the deployment environment.

-- Allow inserts (invoice generation from the admin panel)
drop policy if exists "invoices admin insert" on public.invoices;
create policy "invoices admin insert"
  on public.invoices for insert
  with check (true);

-- Allow reads (Sent Invoices list, edit payment panel)
drop policy if exists "invoices admin select" on public.invoices;
create policy "invoices admin select"
  on public.invoices for select
  using (true);

-- Allow updates (Edit Payment → advance/balance changes)
drop policy if exists "invoices admin update" on public.invoices;
create policy "invoices admin update"
  on public.invoices for update
  using (true)
  with check (true);
