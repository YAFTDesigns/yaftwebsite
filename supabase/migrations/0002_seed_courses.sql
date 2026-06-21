-- YAFT Designs — seed course data (matches app/courses/page.tsx COURSES array)

insert into courses (slug, title, tool, level, duration, description, image_path, pdf_storage_path, active)
values
  (
    'rhino-architecture',
    'Rhino3D Training for Architecture',
    'Rhino3D',
    'Beginner → Inter',
    '30 hrs · 5 days',
    'NURBS fundamentals through advanced freeform surfacing and SubD modeling — recreating real case studies like Zaha Hadid''s Chanel Mobile Art Pavilion and MAD''s Absolute Towers, ending in 3D-print-ready output.',
    '/assets/images/courses/rhino-architecture.jpg',
    'rhino-architecture.pdf',
    true
  ),
  (
    'grasshopper-architecture',
    'Grasshopper Training for Architecture',
    'Grasshopper · Rhino3D',
    'Beginner → Inter',
    '36 hrs · 6 days',
    'Parametric logic, data structures, and form-finding through Grasshopper''s plugin ecosystem — Lunchbox, Ladybug climate analysis, Galapagos optimization, and Kangaroo physics — built around real panel and facade problems.',
    '/assets/images/courses/grasshopper-architecture.jpg',
    'grasshopper-architecture.pdf',
    true
  ),
  (
    'revit-rhino-inside',
    'Revit Architecture + Rhino.Inside.Revit',
    'Revit · Rhino.Inside.Revit',
    'Beginner → Adv',
    '60 hrs · 6 weeks',
    'A 10-module BIM workshop bridging Revit documentation with Rhino/Grasshopper computational geometry — for teams who need both design freedom and BIM compliance, from project setup through parametric family automation.',
    '/assets/images/courses/revit-rhino-inside.jpg',
    'revit-rhino-inside.pdf',
    true
  ),
  (
    'rhino-aec-climate',
    'Rhino3D for AEC & Climate',
    'Rhino3D · Grasshopper · Ladybug',
    'Intermediate',
    '10–15 hrs · 2 days',
    'A compact climate-responsive facade specialization — solar radiation analysis and orientation optimization with Ladybug, working toward kinetic, performance-driven facades in the spirit of Al Bahar Towers.',
    '/assets/images/courses/rhino-aec-climate.jpg',
    'rhino-aec-climate.pdf',
    true
  ),
  (
    'rhino-wearables-footwear',
    'Rhino3D for Wearables & Footwear',
    'Rhino3D · Grasshopper',
    'Intermediate',
    '30 hrs · 5 days',
    'Applying Rhino and Grasshopper to footwear, neckwear, and wristband geometry — Voronoi lattice infill for 3D-printed soles, surface continuity for fit, and prep for fabrication or printing.',
    '/assets/images/courses/rhino-wearables-footwear.jpg',
    'rhino-wearables-footwear.pdf',
    true
  ),
  (
    'rhino-industrial-design',
    'Rhinoceros for Industrial Design',
    'Rhino3D · Grasshopper',
    'Beginner → Adv',
    '30 hrs · 5 days',
    'CNC-aware product modeling — hybrid surface and solid workflows with Loft, SubD, and BlendSrf, then parametric Grasshopper automation for batch DXF export, perforated panels, and manufacture-ready part breakdown.',
    '/assets/images/courses/rhino-industrial-design.jpg',
    'rhino-industrial-design.pdf',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  tool = excluded.tool,
  level = excluded.level,
  duration = excluded.duration,
  description = excluded.description,
  image_path = excluded.image_path,
  pdf_storage_path = excluded.pdf_storage_path,
  active = excluded.active;
