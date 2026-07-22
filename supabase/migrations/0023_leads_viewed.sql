-- Same pattern as 0022 (email_logs): give leads a viewed_at so new
-- leads show up as a red nav badge that clears once the admin has
-- opened the Leads page, instead of no notification at all.

alter table public.leads
  add column if not exists viewed_at timestamptz;
