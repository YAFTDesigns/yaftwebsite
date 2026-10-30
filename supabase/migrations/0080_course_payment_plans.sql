-- Course payment plans: advance + balance (two separate bills) or one full payment, via Razorpay on a private pay link.
-- Additive only. Nothing here changes or deletes existing rows.

create table if not exists public.course_payment_plans (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_at timestamptz not null default now(),
  lead_id uuid,
  client_name text not null,
  client_email text not null,
  client_phone text,
  client_type text not null default 'individual',
  client_company text,
  client_gst text,
  client_state text not null default 'Tamil Nadu',
  description text not null,
  structure text not null default 'instalments' check (structure in ('instalments','full')),
  base_total integer not null check (base_total > 0),   -- full course fee, whole rupees, before GST
  advance_base integer check (advance_base is null or advance_base > 0), -- first instalment before GST; null for 'full'
  status text not null default 'active' check (status in ('active','complete','cancelled')),
  is_test boolean not null default false,
  constraint plan_structure_ok check (
    (structure = 'full' and advance_base is null) or
    (structure = 'instalments' and advance_base is not null and advance_base < base_total)
  )
);
alter table public.course_payment_plans enable row level security;
revoke all on table public.course_payment_plans from anon, authenticated;

create table if not exists public.course_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.course_payment_plans(id) on delete restrict,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('advance','balance','full')),
  amount_minor bigint not null,                 -- what the Razorpay order was created for (gross, incl. GST), paise
  order_id text not null unique,
  payment_id text unique,
  status text not null default 'created' check (status in ('created','paid')),
  paid_at timestamptz,
  test_mode boolean not null default false,
  -- the bill this payment produced (one payment -> one issued bill)
  invoice_id uuid,
  invoice_no text,
  invoice_emailed boolean not null default false,
  -- sync with the accounting records
  sync_status text not null default 'pending' check (sync_status in ('pending','ok','failed','mismatch')),
  sync_error text,
  sync_attempts integer not null default 0,
  synced_at timestamptz,
  -- Razorpay's own charges, kept apart from the student's gross payment (never netted into revenue)
  gateway_fee_minor bigint,
  gateway_tax_minor bigint
);
create index if not exists course_payments_plan_idx on public.course_payments(plan_id);
-- Only one captured payment per instalment of a plan.
create unique index if not exists course_payments_one_paid_per_kind on public.course_payments(plan_id, kind) where status = 'paid';
alter table public.course_payments enable row level security;
revoke all on table public.course_payments from anon, authenticated;

-- Link issued bills to the payment that produced them. Unique, so a webhook retry can never create a second bill.
alter table public.invoices add column if not exists course_plan_id uuid;
alter table public.invoices add column if not exists course_payment_id uuid;
create unique index if not exists invoices_one_per_course_payment on public.invoices(course_payment_id) where course_payment_id is not null;

-- Refunds and credit notes. A refund arrives from Razorpay as 'needs_review'; it only affects the
-- financial-year report once an admin issues a credit note (status 'issued'). Issued rows are never edited.
create table if not exists public.invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  plan_id uuid references public.course_payment_plans(id) on delete restrict,
  payment_row_id uuid references public.course_payments(id) on delete restrict,
  invoice_id uuid,
  razorpay_refund_id text unique,
  refund_minor bigint not null,                 -- gross refunded to the student, paise
  status text not null default 'needs_review' check (status in ('needs_review','issued','dismissed')),
  credit_note_no text unique,
  issued_date text,                             -- DD/MM/YYYY, like invoices.date
  taxable numeric, cgst numeric, sgst numeric, igst numeric, total numeric,
  reason text,
  issued_at timestamptz,
  is_test boolean not null default false
);
alter table public.invoice_adjustments enable row level security;
revoke all on table public.invoice_adjustments from anon, authenticated;

-- Append-only audit trail for everything this integration does or flags. No personal data beyond ids.
create table if not exists public.course_payment_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  plan_id uuid,
  payment_row_id uuid,
  razorpay_payment_id text,
  event text not null,
  detail jsonb
);
create index if not exists course_payment_events_created_idx on public.course_payment_events(created_at desc);
alter table public.course_payment_events enable row level security;
revoke all on table public.course_payment_events from anon, authenticated;
