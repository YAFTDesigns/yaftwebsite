-- Razorpay payments for Tortoise licences. Server-only (service role): RLS on, no policies.
-- payment_id is the idempotency key so a retried webhook never issues keys twice.
create table if not exists public.tortoise_payments (
  payment_id text primary key,
  order_id text,
  email text not null,
  name text,
  amount int not null,              -- minor units charged
  currency text not null,
  quantity int not null default 1,
  license_keys text[] not null default '{}',
  customer_emailed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.tortoise_payments enable row level security;
