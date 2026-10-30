alter table public.student_consents drop constraint if exists student_consents_purpose_check;
delete from public.student_consents where purpose = 'public_verified_badge';
alter table public.student_consents add constraint student_consents_purpose_check
  check (purpose in ('profile_photo','project_publication','testimonial_text','testimonial_photo','course_interest_tracking','marketing'));
alter table public.student_work drop column if exists verified;
alter table public.testimonials drop column if exists verified;
alter table public.students drop column if exists linkedin_verified_at, drop column if exists linkedin_url;
