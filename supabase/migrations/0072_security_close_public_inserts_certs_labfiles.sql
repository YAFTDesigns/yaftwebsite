-- Security audit fixes 02, 03, 04 (applied manually in Supabase on 2026-10-09).
-- Submissions and certificate verification go through server routes (service role).
drop policy if exists "public insert student_work" on public.student_work;
drop policy if exists "public insert publications" on public.publications;
drop policy if exists "public read certificates by exact id" on public.certificates;
-- Lab downloads use short-lived signed URLs only.
update storage.buckets set public = false where id = 'lab-files';
