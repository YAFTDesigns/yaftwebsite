-- Feature Wall: student_work, publications, partners

-- Student Work
create table if not exists public.student_work (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  name             text not null,
  role             text not null,             -- e.g. "M.Arch VIT"
  project_title    text not null,
  tool             text not null,             -- 'rhino' | 'grasshopper' | 'rir'
  category         text not null,             -- e.g. "Facade", "Fabrication", "BIM"
  description      text not null,
  image_url        text,                      -- Supabase storage path
  portfolio_url    text,                      -- LinkedIn / portfolio link
  status           text not null default 'pending'  -- 'pending' | 'approved'
);

alter table public.student_work enable row level security;

-- Public can read approved entries
create policy "public read approved student_work"
  on public.student_work for select
  using (status = 'approved');

-- Anyone can submit (insert)
create policy "public insert student_work"
  on public.student_work for insert
  with check (true);

-- Publications
create table if not exists public.publications (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  author_name      text not null,
  author_role      text not null,
  author_photo_url text,                      -- Supabase storage path
  title            text not null,
  magazine         text not null,
  pub_month        text,                      -- e.g. "Jun"
  pub_year         int not null,
  description      text not null,
  article_url      text,
  status           text not null default 'pending'
);

alter table public.publications enable row level security;

create policy "public read approved publications"
  on public.publications for select
  using (status = 'approved');

create policy "public insert publications"
  on public.publications for insert
  with check (true);

-- Partners
create table if not exists public.partners (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  name             text not null,
  description      text not null,
  logo_url         text,                      -- Supabase storage path
  type             text not null default 'industry',  -- 'academic' | 'industry' | 'collaboration'
  display_order    int not null default 0,
  active           boolean not null default true
);

alter table public.partners enable row level security;

create policy "public read active partners"
  on public.partners for select
  using (active = true);

-- Seed partners (logos already in storage — add manually via admin)
insert into public.partners (name, description, type, display_order) values
  ('VS-CRAFT Facades',  'Facade engineering · India, Singapore, Oman, Australia', 'industry',       1),
  ('IIT Kharagpur',     'Workshop delivery · Computational design',                'academic',       2),
  ('VIT · V-SPARC',    'Visiting faculty · M.Arch / B.Arch',                     'academic',       3),
  ('INTO Designs',      'Vande Bharat cockpit collaboration',                      'collaboration',  4),
  ('C.A.T',             'Architecture training · Institutional',                   'academic',       5),
  ('H.N.A',             'Harmony in Nature & Architecture',                        'industry',       6),
  ('GR Granites',       'Granite design & export',                                 'industry',       7),
  ('Spline & Scripts',  'Design & fabrication studio',                             'industry',       8)
on conflict do nothing;

-- Seed publication: Dasun
insert into public.publications (author_name, author_role, title, magazine, pub_month, pub_year, description, article_url, status) values
  (
    'Dasun Siriwardena',
    'Principal Façade Engineer, SFE Façade Engineering',
    'Think green through the building skin',
    'ACE Update Magazine · Expert Opinion: Façades',
    'Jun', 2026,
    'On integrating façade, HVAC, and lighting through performance-driven design. Features Grasshopper and Rhino workflows for thermal analysis, daylighting, and envelope rationalization at BIAL T2.',
    'https://online.fliphtml5.com/orwf/oxej/40-41',
    'approved'
  )
on conflict do nothing;
