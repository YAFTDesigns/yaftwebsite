-- Institutional enquiries carry a few extra answers (role, participants, preferred
-- duration, preferred dates, city). Stored as a small whitelisted JSON object
-- instead of one column each; the API only writes known keys.
alter table public.enquiries
  add column if not exists details jsonb
  check (details is null or (jsonb_typeof(details) = 'object' and pg_column_size(details) < 2000));
