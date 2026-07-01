-- 0016_seed_hardcoded_data.sql
--
-- Moves content that was previously hardcoded in React components into the DB:
--   • testimonials        → 5 entries hardcoded in components/TestimonialsMarquee.tsx
--   • books               → 4 entries hardcoded in app/resources/page.tsx
--   • videos              → 4 entries hardcoded in app/resources/page.tsx
--   • mentors             → 2 guest mentors hardcoded in app/faculty/page.tsx
--   • workshops           → 6 entries + descriptions hardcoded in app/services/page.tsx
--
-- All inserts use stable UUIDs + ON CONFLICT DO NOTHING so re-running is safe.


-- ── TESTIMONIALS ──────────────────────────────────────────────────────────────
-- Seeding the 5 hardcoded fallback testimonials as approved entries.
-- The testimonials table predates the migrations folder (created in dashboard).
-- Using stable UUID prefixed 1111… for idempotent re-runs.

insert into public.testimonials
  (id, name, role, institution, quote, linkedin_url, instagram_url, show_social, photo_url, rating, status, reviewed_at)
values
  (
    '11111111-1111-0000-0000-000000000001',
    'Harish Ragaventhra', 'Architect', 'Rajalakshmi School of Architecture',
    'I joined YAFT Designs for training in Rhino and Grasshopper, and the learning experience was truly fantastic. Sir is an exceptionally skilled and professional tutor with deep expertise in computational design.',
    'https://www.linkedin.com/in/harish-ragaven-b3487636a', null, true, null, 5.0, 'approved', now()
  ),
  (
    '11111111-1111-0000-0000-000000000002',
    'Lokhesh', 'Architect', null,
    'I recently attended the Rhino software class conducted by Ar. Yokes from YAFT Designs, and I was thoroughly impressed. His patience and dedication stood out the most.',
    null, 'https://www.instagram.com/lok_hesh', true, null, 5.0, 'approved', now()
  ),
  (
    '11111111-1111-0000-0000-000000000003',
    'Sambram Raam', 'BIM Lead', 'AAD Architects, Chennai',
    'You have been my first point of contact whenever I was stuck, had questions, or needed guidance. I have learned a lot working with you, and those lessons will stay with me.',
    'https://www.linkedin.com/in/sambramraam', null, true, null, 5.0, 'approved', now()
  ),
  (
    '11111111-1111-0000-0000-000000000004',
    'Ar. Gangotri', 'Architect', null,
    'The course was well formatted for architects to design and work with Rhino. Yokes, as an instructor, was well-learned and a clear communicator.',
    null, 'https://www.instagram.com/unravellingarchitecture', true, null, 5.0, 'approved', now()
  ),
  (
    '11111111-1111-0000-0000-000000000005',
    'Ar. Chandrasekaran C', 'Architecture Professor', 'VIT Vellore',
    'The training approach at YAFT Designs is genuinely industry-oriented. Students are exposed to real computational workflows that directly translate to professional practice.',
    'https://www.linkedin.com/in/chandrasekaran-c-bb1b9128b/', null, true, null, 5.0, 'approved', now()
  )
on conflict (id) do nothing;


-- ── BOOKS ─────────────────────────────────────────────────────────────────────

create table if not exists public.books (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  title         text        not null,
  author        text        not null,
  description   text        not null,
  tag           text        not null,
  url           text        not null,
  cover_url     text,
  display_order int         not null default 0,
  active        boolean     not null default true
);

alter table public.books enable row level security;

create policy "public read active books"
  on public.books for select
  using (active = true);

insert into public.books (id, title, author, description, tag, url, cover_url, display_order)
values
  (
    '22222222-2222-0000-0000-000000000001',
    'AAD Algorithms-Aided Design',
    'Arturo Tedeschi',
    'The definitive Grasshopper textbook. Covers parametric strategies, data trees, and fabrication logic. Essential for anyone serious about computational design.',
    'Grasshopper',
    'https://www.amazon.in/AAD-Algorithms-Aided-Design-Parametric-Grasshopper/dp/8895315308',
    'https://covers.openlibrary.org/b/isbn/9788895315300-L.jpg',
    1
  ),
  (
    '22222222-2222-0000-0000-000000000002',
    'Advanced 3D Printing with Grasshopper',
    'Diego Pinochet',
    'Clay and FDM workflows using Grasshopper for additive manufacturing. Highly practical — bridges parametric design and physical output.',
    'Grasshopper · Fabrication',
    'https://www.amazon.in/Advanced-3D-Printing-Grasshopper%C2%AE-Clay/dp/B086Y7CLLC',
    'https://covers.openlibrary.org/b/isbn/B086Y7CLLC-L.jpg',
    2
  ),
  (
    '22222222-2222-0000-0000-000000000003',
    'Essential Algorithms and Data Structures for Grasshopper',
    'Robert McNeel & Associates',
    'Free primer on data structures, lists, trees, and algorithmic thinking in Grasshopper. Read this before anything else if you are new to parametric logic.',
    'Grasshopper · Free',
    'https://www.food4rhino.com/en/resource/essential-algorithms-and-data-structures-grasshopper-2nd-edition',
    null,
    3
  ),
  (
    '22222222-2222-0000-0000-000000000004',
    'Computational Design Thinking',
    'Achim Menges & Sean Ahlquist',
    'AD Reader that frames computational design as a design discipline, not just a software skill. Theory-heavy but essential context for architecture students.',
    'Theory · Architecture',
    'https://www.amazon.in/Computational-Design-Thinking-Computation-Reader/dp/0470665653',
    'https://covers.openlibrary.org/b/isbn/9780470665657-L.jpg',
    4
  )
on conflict (id) do nothing;


-- ── VIDEOS ────────────────────────────────────────────────────────────────────

create table if not exists public.videos (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  youtube_id    text        not null unique,
  title         text        not null,
  channel       text        not null default 'YAFT Designs',
  display_order int         not null default 0,
  active        boolean     not null default true
);

alter table public.videos enable row level security;

create policy "public read active videos"
  on public.videos for select
  using (active = true);

insert into public.videos (youtube_id, title, channel, display_order)
values
  ('BC7ScSC-pP0', 'RHINO 8 Clipping Sections: Dynamic Sections, New Features', 'YAFT Designs', 1),
  ('EY6WA3geQcc', 'Ladybug Steps for Installation: Rhino & Grasshopper',        'YAFT Designs', 2),
  ('nspaJbQ1BIg', 'YAFT Designs Short',                                          'Shorts',       3),
  ('rvuW5sQZoLM', 'YAFT Designs Short',                                          'Shorts',       4)
on conflict (youtube_id) do nothing;


-- ── MENTORS ───────────────────────────────────────────────────────────────────
-- Guest mentors previously hardcoded in app/faculty/page.tsx.
-- photo_key references the site-images Supabase storage bucket.

create table if not exists public.mentors (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text        not null,
  role          text        not null,
  bio           text        not null,
  photo_key     text,                              -- key in site-images bucket
  linkedin_url  text,
  type          text        not null default 'guest',  -- 'lead' | 'guest'
  display_order int         not null default 0,
  active        boolean     not null default true
);

alter table public.mentors enable row level security;

create policy "public read active mentors"
  on public.mentors for select
  using (active = true);

insert into public.mentors (id, name, role, bio, photo_key, linkedin_url, type, display_order)
values
  (
    '33333333-3333-0000-0000-000000000001',
    'Mrs. Kavitha Mohanraj',
    'Co-Founder, INTO Designs',
    'Collaborated on the Vande Bharat cockpit facelift, from design through FRP manufacture and 3D mold production.',
    'mentors/kavitha-mohanraj.jpg',
    'https://www.linkedin.com/in/kavithamohanraj/',
    'guest', 1
  ),
  (
    '33333333-3333-0000-0000-000000000002',
    'Mr. Mohafiz Riyaz',
    'Professor, VIT Vellore',
    'Collaborates on architecture education content, covering computational design methods and their place in the design curriculum.',
    'mentors/mohafiz-riyaz.jpg',
    'https://www.linkedin.com/in/mohafiz-riyaz-b2836915b/',
    'guest', 2
  )
on conflict (id) do nothing;


-- ── WORKSHOPS ─────────────────────────────────────────────────────────────────
-- Institutional workshop archive previously hardcoded in app/services/page.tsx.
-- photos is a JSONB array: [{"filename": "cat-2.jpg", "caption": "..."}, ...]
-- All photo files live in the site-images bucket under workshops/<filename>.

create table if not exists public.workshops (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  key           text        not null unique,     -- short slug used for photo folder
  num           text        not null,            -- display number: '01', '02', ...
  place         text        not null,
  title         text        not null,
  role          text        not null,            -- instructor's engagement role
  description   text        not null,
  photos        jsonb       not null default '[]',
  display_order int         not null default 0,
  active        boolean     not null default true
);

alter table public.workshops enable row level security;

create policy "public read active workshops"
  on public.workshops for select
  using (active = true);

insert into public.workshops (id, key, num, place, title, role, description, photos, display_order)
values
  (
    '44444444-4444-0000-0000-000000000001',
    'cat', '01', 'Trivandrum, Kerala', 'CAT Trivandrum',
    'Elective, Parametric Design',
    'Elective module on parametric design fundamentals, covering Grasshopper logic and computational workflows for architecture students.',
    '[
      {"filename": "cat-2.jpg", "caption": "College of Architecture, Trivandrum"},
      {"filename": "cat-3.jpg", "caption": "Introduction to Rhino"},
      {"filename": "cat-4.jpg", "caption": "Workshop participants"},
      {"filename": "cat-1.jpg", "caption": "3D printing on fabric"},
      {"filename": "cat-5.jpg", "caption": "Student-designed 3D printed wearables"}
    ]'::jsonb,
    1
  ),
  (
    '44444444-4444-0000-0000-000000000002',
    'asadi', '02', 'ASADI College of Architecture', 'ASADI College of Architecture',
    'Adjunct Faculty, M.Arch, Advanced Architecture of Emergent Tech',
    'M.Arch-level coursework on emergent technologies in architecture, structured around computational and fabrication-driven design methods.',
    '[
      {"filename": "asadi-2.jpg", "caption": "ASADI campus, Kochi"},
      {"filename": "asadi-3.jpg", "caption": "Studio lounge and student models"},
      {"filename": "asadi-1.jpg", "caption": "Incident radiation analysis using Ladybug"},
      {"filename": "asadi-4.jpg", "caption": "M.Arch student participants"}
    ]'::jsonb,
    2
  ),
  (
    '44444444-4444-0000-0000-000000000003',
    'iitkgp', '03', 'IIT Kharagpur', 'IIT Kharagpur',
    'Workshop: Rhino Modelling',
    'Hands-on Rhino modelling workshop delivered alongside Prof. Gaurab Das Mahapatra, covering NURBS fundamentals through architectural geometry.',
    '[
      {"filename": "iitkgp-1.jpg", "caption": "Architecture and Regional Planning block, IIT Kharagpur"},
      {"filename": "iitkgp-2.jpg", "caption": "Workshop participants"},
      {"filename": "iitkgp-3.jpg", "caption": "Students using Image Sampler in Grasshopper"},
      {"filename": "iitkgp-4.jpg", "caption": "Students practising SubD modelling"},
      {"filename": "iitkgp-5.jpg", "caption": "End of day, Rhino workshop"}
    ]'::jsonb,
    3
  ),
  (
    '44444444-4444-0000-0000-000000000004',
    'navy', '04', 'Indian Navy', 'Metal 3D Printing: Indian Navy Team',
    'Specialized Training',
    'Focused training engagement on metal 3D printing workflows for an Indian Navy technical team.',
    '[
      {"filename": "navy-1.jpg", "caption": "Metal 3D printed lattice component"},
      {"filename": "navy-2.jpg", "caption": "Display of printed and manufactured parts"},
      {"filename": "navy-3.jpg", "caption": "Metal 3D printed structural component"},
      {"filename": "navy-4.jpg", "caption": "Design team participants"},
      {"filename": "navy-5.jpg", "caption": "Design presentation session"}
    ]'::jsonb,
    4
  ),
  (
    '44444444-4444-0000-0000-000000000005',
    'vit', '05', 'VIT Vellore', 'VIT Vellore',
    'Present: Visiting Faculty, March, Digital Fabrications',
    'Ongoing visiting faculty role covering digital fabrication methods as part of the March curriculum track.',
    '[
      {"filename": "vit-1.jpg", "caption": "Parametric workshop, 3rd year architecture"},
      {"filename": "vit-2.jpg", "caption": "Twisting towers, parametric study"},
      {"filename": "vit-3.jpg", "caption": "Integrating Revit and metadata using Elefront"},
      {"filename": "vit-4.jpg", "caption": "M.Arch student session"},
      {"filename": "vit-5.jpg", "caption": "Robotic fabrication using KUKA plugin"}
    ]'::jsonb,
    5
  ),
  (
    '44444444-4444-0000-0000-000000000006',
    'nitt', '06', 'NIT Trichy', 'NIT Trichy',
    'Student-Organized: Climate Responsive Architecture using Ladybug',
    'Student-organized workshop on climate-responsive design methods using Ladybug Tools for environmental analysis and performance-driven form.',
    '[
      {"filename": "nitt-1.jpg", "caption": "NIT Trichy campus"},
      {"filename": "nitt-2.jpg", "caption": "Workshop on finding daylight hours"}
    ]'::jsonb,
    6
  )
on conflict (key) do nothing;
