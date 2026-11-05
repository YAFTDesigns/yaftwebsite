-- One row per Razorpay transaction that has been paid out to the bank, filled from Razorpay's settlement reconciliation report.
-- Joined by payment id to course_payments.razorpay_payment_id and tortoise_payments.payment_id.
create table if not exists public.razorpay_settlements (
  entity_id text primary key,            -- pay_xxx (or rfnd_xxx for a refund)
  type text not null,                    -- payment | refund | adjustment ...
  settlement_id text,
  settlement_utr text,
  settled_at timestamptz,
  amount_minor bigint not null default 0,   -- what the customer paid (paise)
  fee_minor bigint not null default 0,      -- Razorpay fee (paise)
  tax_minor bigint not null default 0,      -- GST on the fee (paise)
  credit_minor bigint not null default 0,   -- what reached the bank for this item (paise)
  test_mode boolean not null default false,
  synced_at timestamptz not null default now()
);
create index if not exists razorpay_settlements_settled_idx on public.razorpay_settlements(settled_at desc);
alter table public.razorpay_settlements enable row level security;
revoke all on table public.razorpay_settlements from anon, authenticated;

alter table public.cron_job_controls drop constraint if exists cron_job_controls_job_check;
alter table public.cron_job_controls add constraint cron_job_controls_job_check
  check (job in ('lead-follow-up','testimonial-request','balance-reminder','accountant-reminder','send-scheduled-invoices','retry-queue','razorpay-settlements'));

insert into public.cron_job_controls (job, enabled, notes)
values ('razorpay-settlements', true, 'Read-only: records which payments Razorpay has paid out to the bank. Sends nothing.')
on conflict (job) do nothing;
