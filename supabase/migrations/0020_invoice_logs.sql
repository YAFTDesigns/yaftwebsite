-- Audit trail for invoice lifecycle events (created, edited, resent,
-- payment updated, deleted/restored, queued/recovered on Supabase
-- hiccups). Denormalizes invoice_no so history survives even if the
-- invoice is later hard-deleted, and doesn't FK to invoices.id for the
-- same reason -- a log entry should never disappear or block on the
-- invoice row's lifecycle.

create table if not exists public.invoice_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  invoice_id  uuid,
  invoice_no  text not null,
  event       text not null,
  message     text not null,
  meta        jsonb not null default '{}'::jsonb
);

alter table public.invoice_logs enable row level security;

create index if not exists invoice_logs_invoice_no_idx on public.invoice_logs (invoice_no);
create index if not exists invoice_logs_created_at_idx on public.invoice_logs (created_at desc);
