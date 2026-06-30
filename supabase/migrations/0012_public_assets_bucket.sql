-- Ensure public-assets bucket exists for testimonial photos etc.
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = true;

-- Public read policy
drop policy if exists "public-assets public read" on storage.objects;
create policy "public-assets public read"
  on storage.objects for select
  using (bucket_id = 'public-assets');

-- Allow uploads (insert) from anyone — testimonial submissions are public
drop policy if exists "public-assets public upload" on storage.objects;
create policy "public-assets public upload"
  on storage.objects for insert
  with check (bucket_id = 'public-assets');
