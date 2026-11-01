-- Corporate training: one bill, many certificates. Each certificate can carry the company and the bill/batch reference.
alter table public.certificates add column if not exists company text;
alter table public.certificates add column if not exists batch_ref text;
create index if not exists certificates_batch_ref_idx on public.certificates (batch_ref) where batch_ref is not null;
