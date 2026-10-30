-- Rollback for 0082_student_portal.sql. Run only if the portal is abandoned; it deletes portal data (never payment data).
drop index if exists public.certificates_one_live_per_enrolment;
drop index if exists public.certificates_verify_token_uq;
alter table public.certificates drop column if exists reissue_of, drop column if exists revoked_reason, drop column if exists revoked_at,
  drop column if exists issued_by, drop column if exists verify_token, drop column if exists completion_date, drop column if exists course_title,
  drop column if exists course_slug, drop column if exists project_id, drop column if exists plan_id, drop column if exists student_id;
drop table if exists public.portal_audit_events;
drop table if exists public.course_interest_events;
drop table if exists public.student_consents;
drop table if exists public.student_testimonials;
drop trigger if exists project_revision_guard_trg on public.project_revisions;
drop function if exists public.project_revision_guard();
drop table if exists public.project_revisions;
drop table if exists public.student_projects;
drop table if exists public.course_rules;
drop table if exists public.claim_reviews;
drop table if exists public.enrolment_claims;
drop table if exists public.student_enrolments;
drop table if exists public.students;
