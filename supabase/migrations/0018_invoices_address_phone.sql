-- Add client address and phone number to invoices, shown under company
-- name in the Bill To block for both individual and company client types.

alter table public.invoices
  add column if not exists client_address text,
  add column if not exists client_phone   text;
