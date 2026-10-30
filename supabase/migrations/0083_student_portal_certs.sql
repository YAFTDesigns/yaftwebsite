-- Student portal part 2. ADDITIVE ONLY.
-- Certificate template fields per course (the printed template needs a product key, suffix and hours). Until an admin sets these,
-- auto-issue for that course is held back and shown as "needs setup", never guessed.
alter table public.course_rules add column if not exists cert_key text;
alter table public.course_rules add column if not exists cert_suffix text check (cert_suffix is null or char_length(cert_suffix) <= 60);
alter table public.course_rules add column if not exists cert_hours text check (cert_hours is null or char_length(cert_hours) <= 6);
-- Cover/gallery/private assets live in a private bucket; the bucket itself is created in the same migration.
insert into storage.buckets (id, name, public, file_size_limit)
values ('student-private', 'student-private', false, 26214400)
on conflict (id) do nothing;
