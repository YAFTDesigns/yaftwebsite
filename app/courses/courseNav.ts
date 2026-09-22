// Single source of truth for which courses have a built detail page,
// and what to call them in navigation. Used by the /courses grid
// (which course slug maps to which route) and by the per-course
// sidebar nav (so visitors can jump between courses without going
// back to /courses every time).
//
// Keyed by the *database* course slug (courses.slug in Supabase),
// since that's what the /courses grid iterates over. `href` is the
// actual route folder name, which doesn't always match the db slug.

export const COURSE_NAV_LIST = [
  { dbSlug: 'rhino-architecture',       title: 'Rhino3D for Architecture',          href: '/courses/rhino3d-architecture' },
  { dbSlug: 'grasshopper-architecture', title: 'Grasshopper for Architecture',      href: '/courses/grasshopper-architecture' },
  { dbSlug: 'revit-rhino-inside',       title: 'Revit Architecture + Rhino.Inside', href: '/courses/revit-rhino-inside' },
  { dbSlug: 'rhino-aec-climate',        title: 'Rhino3D for AEC + Climate',         href: '/courses/rhino3d-aec-climate' },
  { dbSlug: 'rhino-industrial-design',  title: 'Rhino3D for Industrial Design',     href: '/courses/rhino3d-industrial-design' },
  { dbSlug: 'rhino-wearables-footwear', title: 'Rhino3D for Wearables & Footwear',  href: '/courses/rhino-wearables-footwear' },
] as const;

// Shared "Interested in" options for the contact form on every page
// that offers course-level enquiry (Home, Courses, Resources,
// Faculty -- the Services page is deliberately excluded, its form
// asks about service types, not course names, a genuinely different
// list, not a copy of this one that went stale).
//
// This exists because these 4 pages each used to define their own
// separate INTEREST_OPTIONS array, and three of the four quietly
// drifted out of sync with each other over time -- Resources was
// missing 3 of the 6 real courses entirely, caught only because
// Yokes asked directly whether a newly-added course would actually
// show up here. One shared list now; add a course once, it's
// correct everywhere that offers it.
export const COURSE_INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Rhino3D for AEC & Climate',
  'Wearables & Product Design',
  'Industrial Design',
  'Institutional workshop',
  'Consulting project',
];

// Record form, kept for the existing call sites in /courses/page.tsx
// that key off the db slug directly.
export const COURSE_DETAIL_PAGES: Record<string, string> = Object.fromEntries(
  COURSE_NAV_LIST.map((c) => [c.dbSlug, c.href])
);
