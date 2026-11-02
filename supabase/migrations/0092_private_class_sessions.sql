-- Private (one-student) classes and series so a whole run can be moved. Additive.
alter table public.class_sessions add column if not exists student_id uuid references public.students(id) on delete cascade;
alter table public.class_sessions add column if not exists series_id uuid;
create index if not exists class_sessions_student_idx on public.class_sessions (student_id) where student_id is not null;
create index if not exists class_sessions_series_idx on public.class_sessions (series_id) where series_id is not null;
