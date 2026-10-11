-- Two simultaneous Tortoise sales could be given the same invoice number (highest + 1 race).
-- A unique index on the TOR- series makes the second insert fail so the app picks the next number.
-- Partial, so existing YAFT- invoices and any soft-deleted rows are unaffected.
create unique index if not exists invoices_tor_invoice_no_key
  on public.invoices (invoice_no)
  where invoice_no like 'TOR-%' and deleted_at is null;
