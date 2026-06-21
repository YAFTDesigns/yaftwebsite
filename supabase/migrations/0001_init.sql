-- YAFT Designs — initial schema (Phase 1)
-- Run against the Supabase project's Postgres instance (SQL editor or `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists courses (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  title           text not null,
  tool            text,
  level           text,
  duration        text,
  description     text,
  image_path      text,
  pdf_storage_path text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists leads (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  linkedin_url text,
  name         text,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  source       text check (source in ('syllabus_gate', 'contact_form'))
);

create table if not exists syllabus_requests (
  id                     uuid primary key default gen_random_uuid(),
  lead_id                uuid not null references leads(id) on delete cascade,
  course_slug            text not null references courses(slug) on delete restrict,
  requested_at           timestamptz not null default now(),
  signed_url_expires_at  timestamptz
);

create table if not exists enquiries (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid references leads(id) on delete set null,
  name             text not null,
  email            text not null,
  course_interest  text,
  message          text,
  created_at       timestamptz not null default now()
);

create table if not exists analytics_events (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null,
  lead_id      uuid references leads(id) on delete set null,
  event_type   text not null check (event_type in (
                 'page_view', 'syllabus_modal_open', 'syllabus_unlock', 'enquiry_submit'
               )),
  page         text,
  course_slug  text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create table if not exists certificates (
  id                uuid primary key default gen_random_uuid(),
  certificate_code  text unique not null,
  student_name      text not null,
  email             text not null,
  course_slug       text references courses(slug) on delete set null,
  issued_at         date not null default current_date,
  pdf_storage_path  text,
  status            text not null default 'active' check (status in ('active', 'revoked')),
  issued_by         text,
  created_at        timestamptz not null default now()
);

create table if not exists certificate_verifications (
  id                          uuid primary key default gen_random_uuid(),
  certificate_code_attempted  text not null,
  matched                     boolean not null,
  ip_hash                     text,
  created_at                  timestamptz not null default now()
);

create index if not exists idx_syllabus_requests_lead_id on syllabus_requests(lead_id);
create index if not exists idx_syllabus_requests_course_slug on syllabus_requests(course_slug);
create index if not exists idx_enquiries_lead_id on enquiries(lead_id);
create index if not exists idx_analytics_events_session_id on analytics_events(session_id);
create index if not exists idx_analytics_events_lead_id on analytics_events(lead_id);
create index if not exists idx_certificates_course_slug on certificates(course_slug);

-- Row Level Security

alter table courses enable row level security;
alter table leads enable row level security;
alter table syllabus_requests enable row level security;
alter table enquiries enable row level security;
alter table analytics_events enable row level security;
alter table certificates enable row level security;
alter table certificate_verifications enable row level security;

-- courses: public can read active rows only; no anon writes
create policy "courses_public_select_active" on courses
  for select
  using (active = true);

-- leads, syllabus_requests, enquiries, analytics_events: no anon access at all.
-- All reads/writes go through API routes using the service-role key, which bypasses RLS,
-- so intentionally no policies are created for anon/authenticated roles on these tables.

-- certificates: no public select; verification is mediated by the API route using the
-- service-role key. No policies created for anon/authenticated roles.

-- certificate_verifications: write-only audit log via service role. No public policies.
