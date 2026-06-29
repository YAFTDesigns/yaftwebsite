alter table public.invoices
  add column if not exists advance numeric not null default 0,
  add column if not exists balance numeric not null default 0;
