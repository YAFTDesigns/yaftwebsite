-- Tortoise sales: buyer state/GSTIN for the tax invoice, the invoice number issued, and a test-mode flag.
alter table public.tortoise_payments
  add column if not exists buyer_state text,
  add column if not exists buyer_gstin text,
  add column if not exists invoice_no text,
  add column if not exists test_mode boolean not null default false;
