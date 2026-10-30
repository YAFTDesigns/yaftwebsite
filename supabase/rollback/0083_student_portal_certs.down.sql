alter table public.course_rules drop column if exists cert_hours, drop column if exists cert_suffix, drop column if exists cert_key;
-- The student-private bucket is left in place on purpose: delete it from the dashboard only after its files are exported.
