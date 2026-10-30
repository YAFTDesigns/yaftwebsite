-- Link published site rows back to the portal record, so a withdrawal or a new approved version can find and retire the right row. ADDITIVE.
alter table public.student_work add column if not exists portal_project_id uuid;
alter table public.testimonials add column if not exists portal_testimonial_id uuid;
create index if not exists student_work_portal_project_idx on public.student_work(portal_project_id) where portal_project_id is not null;
create index if not exists testimonials_portal_idx on public.testimonials(portal_testimonial_id) where portal_testimonial_id is not null;
