-- Categories are now a first-class, editable entity rather than free
-- text on each script -- Yokes wants to rename/reorder a category
-- (e.g. "Grasshopper") after publishing without it silently
-- affecting how scripts are grouped. display_order controls both the
-- category's own position and its number in the sidebar ("1.
-- Grasshopper", "2. Rhino"); scripts within a category are numbered
-- by their own display_order ("1.1", "1.2").
create table if not exists lab_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table lab_categories enable row level security;

-- category_id is the new source of truth for grouping. tool (the old
-- free-text field) is kept rather than dropped -- existing rows still
-- have it, and it's harmless to leave alongside category_id.
alter table lab_scripts add column if not exists category_id uuid references lab_categories(id) on delete set null;

-- Separate from thumbnail_path: the grid card shows thumbnail_path
-- (small, image-only, hover reveals the title), the detail view shows
-- detail_image_path if set, falling back to thumbnail_path if a
-- script only ever got one image uploaded.
alter table lab_scripts add column if not exists detail_image_path text;

-- Backfill: turn whatever free-text 'tool' values already exist into
-- real category rows, and point existing scripts at them, so nothing
-- already entered through the admin loses its grouping.
insert into lab_categories (name, display_order)
select tool, row_number() over (order by tool) from (select distinct tool from lab_scripts) t
on conflict do nothing;

update lab_scripts s set category_id = c.id
from lab_categories c
where s.category_id is null and s.tool = c.name;
