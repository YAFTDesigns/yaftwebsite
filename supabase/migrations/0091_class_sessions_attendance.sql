-- Live classes and attendance. ADDITIVE ONLY. Students never receive the meeting link directly: they press a Join button that logs the join and then redirects.
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null check (char_length(course_slug) <= 80),
  title text not null check (char_length(title) <= 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meet_url text not null check (char_length(meet_url) <= 400),
  recording_url text check (recording_url is null or char_length(recording_url) <= 400),
  notes text check (notes is null or char_length(notes) <= 500),
  cancelled_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists class_sessions_slug_start_idx on public.class_sessions (course_slug, starts_at);
alter table public.class_sessions enable row level security;
revoke all on table public.class_sessions from anon, authenticated;

create table if not exists public.class_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  first_joined_at timestamptz not null default now(),
  last_joined_at timestamptz not null default now(),
  join_count int not null default 1,
  unique (session_id, student_id)
);
create index if not exists class_attendance_student_idx on public.class_attendance (student_id);
alter table public.class_attendance enable row level security;
revoke all on table public.class_attendance from anon, authenticated;
