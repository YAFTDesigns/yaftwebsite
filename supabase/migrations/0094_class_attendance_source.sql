-- Attendance can also be marked by hand (class held on a link shared outside the portal).
alter table public.class_attendance add column if not exists source text not null default 'join' check (source in ('join','manual'));
alter table public.class_attendance add column if not exists marked_by text;
