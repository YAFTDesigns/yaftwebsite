-- Independent on/off switch (plus optional lifetime send cap and approved
-- recipient list) for every scheduled job. Deliberately separate from
-- CRON_SECRET: the secret only proves a call came from the scheduler; it must
-- not be what decides which jobs are allowed to act. Every job starts
-- DISABLED. A job with no row is treated as disabled by the code.
create table if not exists public.cron_job_controls (
  job              text primary key
                   check (job in ('lead-follow-up','testimonial-request','balance-reminder','accountant-reminder','send-scheduled-invoices','retry-queue')),
  enabled          boolean not null default false,
  max_total_sends  integer check (max_total_sends is null or max_total_sends >= 0),
  approved_emails  text[],
  notes            text,
  updated_at       timestamptz not null default now(),
  updated_by       text
);

alter table public.cron_job_controls enable row level security;
-- No policies on purpose: only the service role (server code) touches this.

insert into public.cron_job_controls (job, enabled, notes) values
  ('lead-follow-up',          false, 'Customer-facing. Pilot: cap + approved list required.'),
  ('testimonial-request',     false, 'Customer-facing. Held off pending a personal decision.'),
  ('balance-reminder',        false, 'Internal nudge to owner only.'),
  ('accountant-reminder',     false, 'Internal alert to owner only.'),
  ('send-scheduled-invoices', false, 'Customer-facing: sends real invoices.'),
  ('retry-queue',             false, 'Re-inserts queued enquiries/invoices into the database; sends no customer email.')
on conflict (job) do nothing;
