-- client_company was being collected in the create-invoice form and
-- shown on the PDF/email, but was never actually persisted to the
-- invoices table -- meant editing/resending an invoice later had no
-- way to recover the company name. invoice_type similarly wasn't
-- stored, so a resent invoice couldn't reliably reproduce which
-- template (training / consultancy / proforma) was originally used.

alter table public.invoices
  add column if not exists client_company text,
  add column if not exists invoice_type text not null default 'training';
