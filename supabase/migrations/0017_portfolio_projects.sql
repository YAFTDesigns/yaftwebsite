-- Portfolio: curated project case studies for /projects
-- Scaffolded with placeholder rows (active = false) — fill in real content via /admin/projects.

create table if not exists public.portfolio_projects (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  slug             text not null unique,
  title            text not null,
  category         text not null,             -- 'facade' | 'bim-automation' | 'computational-design' | 'wearables' | 'product'
  location         text not null,             -- e.g. "Hong Kong", "Coimbatore, India"
  client_or_collab text,                      -- e.g. "INTO Designs", "Aluvision Facade Solutions"
  year             int,
  summary          text not null,             -- one-line, used on the grid card
  description      text not null,             -- longer copy, used in the lightbox / future detail page
  cover_image_path text,                      -- Supabase storage path under site-images/projects/
  gallery          jsonb not null default '[]'::jsonb,  -- [{ filename, caption }]
  display_order    int not null default 0,
  featured         boolean not null default false,
  active           boolean not null default true
);

alter table public.portfolio_projects enable row level security;

create policy "public read active portfolio_projects"
  on public.portfolio_projects for select
  using (active = true);

-- Placeholder seed rows, inactive until real content + images are added via admin.
insert into public.portfolio_projects
  (slug, title, category, location, client_or_collab, summary, description, display_order, active)
values
  ('vande-bharat-cockpit', 'Vande Bharat Cockpit Facelift', 'product', 'India', 'INTO Designs',
   'Placeholder — cockpit facelift collaboration, awaiting content.', 'Placeholder description.', 1, false),
  ('yuen-long-stadium', 'Yuen Long Stadium Roofing', 'facade', 'Hong Kong', null,
   'Placeholder — gutter panel unrolling and roofing documentation, awaiting content.', 'Placeholder description.', 2, false),
  ('marina-bay-sands-arena', 'Marina Bay Sands Arena Roofing', 'facade', 'Singapore', null,
   'Placeholder — roofing project, awaiting content.', 'Placeholder description.', 3, false),
  ('changi-t5', 'Singapore Changi Terminal 5', 'facade', 'Singapore', null,
   'Placeholder — facade tender work, awaiting content.', 'Placeholder description.', 4, false),
  ('lt-sewri-crown', 'L&T Sewri Residential Crown Facade', 'facade', 'Mumbai, India', 'Aluvision Facade Solutions',
   'Placeholder — facade RFI and drawing register, awaiting content.', 'Placeholder description.', 5, false),
  ('oman-facade-projects', 'Oman Facade Projects', 'facade', 'Oman', null,
   'Placeholder — facade documentation across Oman sites, awaiting content.', 'Placeholder description.', 6, false)
on conflict (slug) do nothing;
