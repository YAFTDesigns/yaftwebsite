-- Project card fields that mirror the public Community Works submission form. ADDITIVE.
alter table public.student_projects add column if not exists public_role text check (public_role is null or char_length(public_role) <= 80);
alter table public.student_projects add column if not exists tool text check (tool is null or tool in ('rhino','grasshopper','rir'));
alter table public.student_projects add column if not exists category text check (category is null or char_length(category) <= 60);
alter table public.student_projects add column if not exists profile_photo_path text;   -- private bucket path, copied public only on approval + consent
