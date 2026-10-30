-- Two-instalment course payments (advance + balance) taken through Razorpay on a private pay link.
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
  base_total integer not null check (base_total > 0),      -- full course fee in whole rupees, before GST
  advance_base integer not null check (advance_base > 0),  -- first instalment in whole rupees, before GST
  status text not null default 'active' check (status in ('active','complete','cancelled')),
  invoice_id uuid,
  invoice_no text,
  constraint advance_below_total check (advance_base < base_total)
);
alter table public.course_payment_plans enable row level security;
revoke all on table public.course_payment_plans from anon, authenticated;

create table if not exists public.course_payments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.course_payment_plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('advance','balance')),
  amount_minor bigint not null,                -- amount the Razorpay order was created for, in paise
  order_id text not null unique,
  payment_id text unique,
  status text not null default 'created' check (status in ('created','paid')),
  paid_at timestamptz,
  fulfilled boolean not null default false,    -- invoice created/updated and emailed
  test_mode boolean not null default false
);
create index if not exists course_payments_plan_idx on public.course_payments(plan_id);
alter table public.course_payments enable row level security;
revoke all on table public.course_payments from anon, authenticated;
