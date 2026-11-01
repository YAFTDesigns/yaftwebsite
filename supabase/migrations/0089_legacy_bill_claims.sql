-- Older students (billed before the student portal existed) can link their enrolment by entering the bill number.
-- A "legacy" plan is a settled record made from the old bill; it carries no payments of its own.
alter table public.course_payment_plans drop constraint if exists course_payment_plans_source_check;
alter table public.course_payment_plans add constraint course_payment_plans_source_check check (source in ('admin','enroll','legacy'));

alter table public.student_enrolments drop constraint if exists student_enrolments_linked_via_check;
alter table public.student_enrolments add constraint student_enrolments_linked_via_check check (linked_via in ('claim_link','checkout_signed_in','admin','bill_number'));
