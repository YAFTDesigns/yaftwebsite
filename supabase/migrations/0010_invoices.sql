create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  invoice_no    text not null,
  date          text not null,
  client_name   text not null,
  client_email  text not null,
  client_type   text not null default 'individual',
  client_pan    text,
  client_gst    text,
  client_state  text not null,
  items         jsonb not null,
  total         numeric not null,
  status        text not null default 'sent'
);

alter table public.invoices enable row level security;
