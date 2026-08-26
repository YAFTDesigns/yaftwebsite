-- YAFT Labs: free (and later, optionally paid) Grasshopper/Rhino
-- scripts, tied to Instagram reels, meant to give reel viewers a
-- concrete reason to visit the site. tool is a free-text category
-- (Grasshopper, Rhino, Rhino.Inside.Revit, etc.) used for the public
-- page's filter chips. price stays 0 for every script for now --
-- kept as a real numeric column from day one rather than a later
-- migration, since Yokes was explicit about wanting the option to
-- charge "peanuts" for more detailed scripts down the line.
-- download_count is the "how many have viewed" number, incremented
-- server-side when the actual download route is hit, not on page view
-- (a page view isn't the same signal as someone actually downloading).
create table if not exists lab_scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  tool text not null default 'Grasshopper',
  price numeric not null default 0,
  file_path text,
  thumbnail_path text,
  download_count integer not null default 0,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table lab_scripts enable row level security;
-- No anon-role policies added -- matches the security posture already
-- enforced across every other table on this project (zero anon
-- policies, confirmed repeatedly this session). Public reads happen
-- through the server-rendered page and the service-role-backed
-- download route, never direct client-side table access.

-- Dedicated bucket for the actual script files (.gh, .3dm, etc.),
-- separate from site-images the same way `syllabus` already has its
-- own bucket for PDFs rather than everything sharing one bucket.
insert into storage.buckets (id, name, public) values ('lab-files', 'lab-files', true) on conflict (id) do nothing;
