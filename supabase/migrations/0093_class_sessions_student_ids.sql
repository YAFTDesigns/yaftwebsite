-- Private sessions can be for 1 to 3 students: student_ids replaces the single student_id (kept, no longer used by the app).
alter table public.class_sessions add column if not exists student_ids uuid[];
update public.class_sessions set student_ids = array[student_id] where student_id is not null and student_ids is null;
create index if not exists class_sessions_student_ids_idx on public.class_sessions using gin (student_ids);
