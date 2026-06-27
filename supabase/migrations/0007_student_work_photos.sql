-- Add photo columns to student_work table
alter table public.student_work
  add column if not exists profile_photo_url  text,
  add column if not exists project_image_urls text[];
