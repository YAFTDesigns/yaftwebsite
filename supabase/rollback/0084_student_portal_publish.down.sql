drop index if exists public.testimonials_portal_idx;
drop index if exists public.student_work_portal_project_idx;
alter table public.testimonials drop column if exists portal_testimonial_id;
alter table public.student_work drop column if exists portal_project_id;
