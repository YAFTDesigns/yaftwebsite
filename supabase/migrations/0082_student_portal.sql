-- Student portal. ADDITIVE ONLY: new tables plus nullable columns on certificates. No existing row is changed.
-- Payments, bills, plans, invoices and accounting are NOT copied or altered: a student's enrolment is a LINK to an
-- existing course_payment_plans row, so there is no second ledger.
-- Every table is RLS-enabled with all grants revoked from anon/authenticated (same pattern as the rest of the site):
-- data is reached only through server routes that derive the student from the verified session, never from the browser.
-- Rollback: supabase/rollback/0082_student_portal.down.sql

-- A student profile, 1:1 with an auth user. Email is NOT stored here: it is read from the verified auth identity.
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text check (display_name is null or char_length(display_name) <= 80),
  certificate_name text check (certificate_name is null or char_length(certificate_name) <= 80), -- separate from display_name
  phone text check (phone is null or char_length(phone) <= 20),
  avatar_path text,                      -- private bucket path; null = initials
  deleted_at timestamptz
);
alter table public.students enable row level security;
revoke all on table public.students from anon, authenticated;

-- Link: this student owns this existing payment plan (enrolment). One plan belongs to at most one student.
create table if not exists public.student_enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  plan_id uuid not null unique references public.course_payment_plans(id) on delete restrict,
  linked_at timestamptz not null default now(),
  linked_via text not null check (linked_via in ('claim_link','checkout_signed_in','admin')),
  linked_by text                          -- admin email when linked_via = 'admin'
);
create index if not exists student_enrolments_student_idx on public.student_enrolments(student_id);
alter table public.student_enrolments enable row level security;
revoke all on table public.student_enrolments from anon, authenticated;

-- Guest-enrolment claims. The raw token is only ever in the email; we keep a SHA-256 hash. Single use, expiring.
create table if not exists public.enrolment_claims (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.course_payment_plans(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sent_to_hash text not null,             -- hash of the address it was sent to (billing email on the plan)
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id) on delete set null,
  failed_attempts integer not null default 0
);
create index if not exists enrolment_claims_plan_idx on public.enrolment_claims(plan_id);
alter table public.enrolment_claims enable row level security;
revoke all on table public.enrolment_claims from anon, authenticated;

-- Anything the automatic claim flow cannot settle safely goes to an admin.
create table if not exists public.claim_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.course_payment_plans(id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz
);
alter table public.claim_reviews enable row level security;
revoke all on table public.claim_reviews from anon, authenticated;

-- Per-course rules and batch details. Certificate payment policy is configurable and flagged for owner confirmation.
create table if not exists public.course_rules (
  course_slug text primary key,
  requires_full_payment boolean not null default true,   -- PROPOSED default, to be confirmed by the owner before launch
  batch_label text,
  starts_on date,
  ends_on date,
  balance_due_on date,                    -- a due DATE is separate from whether the Pay button is available
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.course_rules enable row level security;
revoke all on table public.course_rules from anon, authenticated;

-- Projects. A project has revisions; an approved revision is immutable (trigger below).
create table if not exists public.student_projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  plan_id uuid not null references public.course_payment_plans(id) on delete restrict,
  course_slug text not null,
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','submitted','under_review','changes_requested','approved')),
  publish_consent boolean not null default false,
  public_display_name text check (public_display_name is null or char_length(public_display_name) <= 80),
  published_revision_id uuid,             -- the approved revision currently public (null = private)
  unique (plan_id, course_slug)
);
alter table public.student_projects enable row level security;
revoke all on table public.student_projects from anon, authenticated;

create table if not exists public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.student_projects(id) on delete cascade,
  rev_no integer not null,
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 4000),
  links jsonb not null default '[]'::jsonb,                 -- validated https links only (checked in server code)
  cover_path text,                        -- PUBLIC-eligible asset (served only after approval + consent)
  gallery_paths text[] not null default '{}',               -- PUBLIC-eligible assets
  private_files jsonb not null default '[]'::jsonb,         -- PRIVATE supporting files: never public
  status text not null default 'draft' check (status in ('draft','submitted','under_review','changes_requested','approved')),
  submitted_at timestamptz,
  feedback text check (feedback is null or char_length(feedback) <= 4000),   -- internal until released to the student
  feedback_released boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  unique (project_id, rev_no)
);
alter table public.project_revisions enable row level security;
revoke all on table public.project_revisions from anon, authenticated;

-- An approved revision can never be edited in place: a later edit must create a new revision.
create or replace function public.project_revision_guard() returns trigger language plpgsql as $$
begin
  if old.status = 'approved' and (
       new.title is distinct from old.title or new.description is distinct from old.description or
       new.links is distinct from old.links or new.cover_path is distinct from old.cover_path or
       new.gallery_paths is distinct from old.gallery_paths or new.private_files is distinct from old.private_files or
       new.status is distinct from old.status) then
    raise exception 'An approved project revision is immutable; create a new revision';
  end if;
  return new;
end $$;
drop trigger if exists project_revision_guard_trg on public.project_revisions;
create trigger project_revision_guard_trg before update on public.project_revisions for each row execute function public.project_revision_guard();

-- Testimonials: drafts live here and are moderated. Approval copies the approved text into the existing testimonials table.
create table if not exists public.student_testimonials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  plan_id uuid not null references public.course_payment_plans(id) on delete restrict,
  course_slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','submitted','changes_requested','approved','withdrawn')),
  quote text check (quote is null or char_length(quote) <= 1200),
  public_display_name text check (public_display_name is null or char_length(public_display_name) <= 80),
  photo_path text,
  text_consent_at timestamptz,            -- separate consent for the text
  photo_consent_at timestamptz,           -- separate consent for the photo
  feedback text check (feedback is null or char_length(feedback) <= 1000),
  published_testimonial_id uuid,          -- row in the existing testimonials table once approved
  unique (plan_id, course_slug)
);
alter table public.student_testimonials enable row level security;
revoke all on table public.student_testimonials from anon, authenticated;

-- Consent ledger: purpose, version, time. Withdrawal is a new row, never an edit.
create table if not exists public.student_consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  purpose text not null check (purpose in ('profile_photo','project_publication','testimonial_text','testimonial_photo','course_interest_tracking','marketing')),
  version text not null,
  granted boolean not null,
  subject_id uuid,                        -- the project / testimonial this consent applies to, if any
  created_at timestamptz not null default now()
);
create index if not exists student_consents_student_idx on public.student_consents(student_id, purpose, created_at desc);
alter table public.student_consents enable row level security;
revoke all on table public.student_consents from anon, authenticated;

-- Signed-in course interest. One row per (student, course, event, day): deduplicated. Only recorded with consent.
create table if not exists public.course_interest_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_slug text not null,
  event text not null check (event in ('viewed','enroll_clicked','checkout_started','enrolled')),
  day date not null default (now() at time zone 'Asia/Kolkata')::date,
  created_at timestamptz not null default now(),
  unique (student_id, course_slug, event, day)
);
alter table public.course_interest_events enable row level security;
revoke all on table public.course_interest_events from anon, authenticated;

-- Audit trail for portal events. No tokens, passwords or payment data are ever written here.
create table if not exists public.portal_audit_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('student','admin','system','anonymous')),
  actor_ref text,                         -- student id or admin email, never a token
  action text not null,
  subject text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists portal_audit_events_action_idx on public.portal_audit_events(action, created_at desc);
alter table public.portal_audit_events enable row level security;
revoke all on table public.portal_audit_events from anon, authenticated;

-- Certificates: extend the existing table (nullable columns, nothing rewritten).
alter table public.certificates add column if not exists student_id uuid references public.students(id) on delete set null;
alter table public.certificates add column if not exists plan_id uuid references public.course_payment_plans(id) on delete set null;
alter table public.certificates add column if not exists project_id uuid references public.student_projects(id) on delete set null;
alter table public.certificates add column if not exists course_slug text;
alter table public.certificates add column if not exists course_title text;
alter table public.certificates add column if not exists completion_date date;
alter table public.certificates add column if not exists verify_token text;           -- non-enumerable, 128-bit, for the QR link
alter table public.certificates add column if not exists issued_by text;              -- 'auto' or an admin email
alter table public.certificates add column if not exists revoked_at timestamptz;
alter table public.certificates add column if not exists revoked_reason text;
alter table public.certificates add column if not exists reissue_of uuid;
create unique index if not exists certificates_verify_token_uq on public.certificates(verify_token) where verify_token is not null;
-- No duplicate auto-issue: at most one live (not revoked) certificate per enrolment + course.
create unique index if not exists certificates_one_live_per_enrolment on public.certificates(plan_id, course_slug) where plan_id is not null and revoked = false;
