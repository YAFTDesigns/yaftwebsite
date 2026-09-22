-- Admin-editable images for the 4 fixed Services-page entries, so
-- Yokes can swap any of them later from the admin panel without a
-- code change. Seeded with 4 real images found in the existing asset
-- archive (not stock/invented): two from the insights case-study
-- covers (facade-fin-clustering shell render, a Rhino->Revit shop-
-- drawing screenshot), two from real workshop photography (a live
-- CAT Trivandrum teaching session, a professional IIT Kharagpur
-- cohort photo distinct from the student-classroom feel of the CAT
-- one). image_path currently points at existing local /public files
-- (these images were never in Supabase Storage to begin with, and
-- there's no tool available to upload them there directly) -- the
-- app code treats a leading "/" as a direct public path and anything
-- else as a site-images Storage object, so a future upload through
-- the new admin UI works the same way workshop photos already do,
-- without needing to migrate these four first.
create table if not exists service_images (
  service_key text primary key,
  image_path text,
  caption text,
  updated_at timestamptz not null default now()
);
alter table service_images enable row level security;

insert into service_images (service_key, image_path, caption) values
  ('parametric-facade', '/assets/images/insights/fin-clustering-shell-cover.jpg', 'Facade fin clustering: 1,048 double-curved panels grouped into 123 manufacturable clusters'),
  ('shop-drawing', '/assets/images/insights/rhino-inside-revit-cover.jpg', 'Parametric stair model in Rhino, taken straight through to Revit construction documentation'),
  ('college-workshops', '/assets/images/workshops/cat-3.jpg', 'Live Grasshopper session, CAT Trivandrum'),
  ('corporate-training', '/assets/images/workshops/iitkgp-2.jpg', 'Workshop cohort, IIT Kharagpur, Department of Architecture and Regional Planning')
on conflict (service_key) do nothing;
