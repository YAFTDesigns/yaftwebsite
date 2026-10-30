-- Verified student badge. "Verified" = a paid YAFT enrolment AND a LinkedIn account connected through LinkedIn sign-in (proof of ownership),
-- shown publicly only with the student's own consent. ADDITIVE (one consent purpose is added to the allowed list).
alter table public.students add column if not exists linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 200);   -- public profile address the student typed (not proof by itself)
alter table public.students add column if not exists linkedin_verified_at timestamptz;                                                    -- set only when a LinkedIn sign-in identity is attached to the account
alter table public.testimonials add column if not exists verified boolean not null default false;
alter table public.student_work add column if not exists verified boolean not null default false;
alter table public.student_consents drop constraint if exists student_consents_purpose_check;
alter table public.student_consents add constraint student_consents_purpose_check
  check (purpose in ('profile_photo','project_publication','testimonial_text','testimonial_photo','course_interest_tracking','marketing','public_verified_badge'));
