-- Course checkout: admin-assigned fees, bundles (e.g. Rhino + Grasshopper), live USD rate cache. Additive only.

alter table public.courses add column if not exists fee_inr integer check (fee_inr is null or fee_inr > 0);   -- base fee in whole rupees, before GST
alter table public.courses add column if not exists checkout_enabled boolean not null default false;

create table if not exists public.course_bundles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  title text not null,
  description text,
  course_slugs text[] not null check (array_length(course_slugs, 1) >= 2),
  fee_inr integer not null check (fee_inr > 0),
  active boolean not null default true,
  sort integer not null default 0
);
alter table public.course_bundles enable row level security;
revoke all on table public.course_bundles from anon, authenticated;

-- Last known exchange rates. A new row is written at most every few hours; the newest row is what checkout uses.
create table if not exists public.fx_rates (
  id bigint generated always as identity primary key,
  fetched_at timestamptz not null default now(),
  source text not null,
  inr_per_usd numeric not null check (inr_per_usd > 30 and inr_per_usd < 300)
);
alter table public.fx_rates enable row level security;
revoke all on table public.fx_rates from anon, authenticated;

-- Plans can be created by the client at checkout, in INR or USD.
alter table public.course_payment_plans add column if not exists currency text not null default 'INR' check (currency in ('INR','USD'));
alter table public.course_payment_plans add column if not exists source text not null default 'admin' check (source in ('admin','enroll'));
alter table public.course_payment_plans add column if not exists course_slugs text[];

-- What the client is actually charged. amount_minor stays the bill amount in INR paise; for USD plans the
-- charge is a frozen quote at the moment the order was made.
alter table public.course_payments add column if not exists charge_currency text not null default 'INR' check (charge_currency in ('INR','USD'));
alter table public.course_payments add column if not exists charge_minor bigint;
alter table public.course_payments add column if not exists fx_inr_per_usd numeric;
