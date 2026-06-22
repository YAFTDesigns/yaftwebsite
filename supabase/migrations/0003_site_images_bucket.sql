-- Public Storage bucket for site images (course thumbnails, mentor/faculty photos).
-- Unlike syllabus PDFs, these aren't gated content — a public bucket + stable
-- public URL is the right shape, no signed URLs needed.

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

create policy "site_images_public_read"
  on storage.objects for select
  using (bucket_id = 'site-images');
