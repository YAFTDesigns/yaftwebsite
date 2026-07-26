-- site-images bucket is public=true, so direct fetch-by-known-path
-- already works for anyone regardless of RLS -- that's how the whole
-- site serves images and is intentional. The separate SELECT policy
-- "site_images_public_read" on storage.objects wasn't needed for that
-- to work; its only real effect was allowing anyone to LIST/enumerate
-- every filename in the bucket via the Storage API's list operation,
-- which the app itself never does (only getPublicUrl by known path).
-- Dropping it removes enumeration without affecting how images are
-- actually served.

drop policy if exists "site_images_public_read" on storage.objects;
