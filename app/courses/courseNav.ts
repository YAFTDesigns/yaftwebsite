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
  { dbSlug: 'rhino-architecture',       title: 'Rhino3D for Architecture',          href: '/courses/rhino3d-architecture',       enquiryLabel: 'Rhino3D for Architecture' },
  { dbSlug: 'grasshopper-architecture', title: 'Grasshopper for Architecture',      href: '/courses/grasshopper-architecture',   enquiryLabel: 'Grasshopper for Computational Design' },
  { dbSlug: 'revit-rhino-inside',       title: 'Revit Architecture + Rhino.Inside', href: '/courses/revit-rhino-inside',         enquiryLabel: 'Rhino.Inside.Revit' },
  { dbSlug: 'rhino-aec-climate',        title: 'Rhino3D for AEC + Climate',         href: '/courses/rhino3d-aec-climate',        enquiryLabel: 'Rhino3D for AEC & Climate' },
  { dbSlug: 'rhino-industrial-design',  title: 'Rhino3D for Industrial Design',     href: '/courses/rhino3d-industrial-design',  enquiryLabel: 'Industrial Design' },
  { dbSlug: 'rhino-wearables-footwear', title: 'Rhino3D for Wearables & Footwear',  href: '/courses/rhino-wearables-footwear',   enquiryLabel: 'Wearables & Product Design' },
] as const;

// Non-course options that belong on the contact form alongside the
// course list but aren't courses themselves -- kept separate so
// adding a course never means touching this too.
const NON_COURSE_INTEREST_OPTIONS = ['Institutional workshop', 'Consulting project'];

// Pure derivation, testable on its own with mock course lists rather
// than only through the real, static COURSE_NAV_LIST below -- see
// courseNav.test.ts for the actual regression guard: adding a
// hypothetical new course must produce a new option automatically,
// with no other code touched.
export function deriveInterestOptions(
  courses: readonly { enquiryLabel: string }[],
  nonCourseOptions: string[]
): string[] {
  return [...courses.map((c) => c.enquiryLabel), ...nonCourseOptions];
}

// Shared "Interested in" options for the contact form on every page
// that offers course-level enquiry (Home, Courses, Resources,
// Faculty -- the Services page is deliberately excluded, its form
// asks about service types, not course names, a genuinely different
// list, not a copy of this one that went stale).
//
// Derived from COURSE_NAV_LIST rather than hand-maintained separately
// -- the previous version was one shared array, which fixed 4 lists
// silently drifting apart from EACH OTHER, but was still a second,
// manually-updated list that could drift from the real course list
// itself the next time a course got added and this got forgotten.
// Now there's nothing separate to remember: add a course to
// COURSE_NAV_LIST (already required for its detail page and nav to
// exist at all) and its enquiryLabel appears here automatically. The
// label deliberately isn't always the same text as the nav title --
// e.g. "Industrial Design" here vs "Rhino3D for Industrial Design"
// there -- broader, more searchable phrasing for a lead reading a
// dropdown versus a specific course page title, which is why this
// derives from an explicit enquiryLabel field rather than just
// reusing title directly.
export const COURSE_INTEREST_OPTIONS = deriveInterestOptions(COURSE_NAV_LIST, NON_COURSE_INTEREST_OPTIONS);

// Record form, kept for the existing call sites in /courses/page.tsx
// that key off the db slug directly.
export const COURSE_DETAIL_PAGES: Record<string, string> = Object.fromEntries(
  COURSE_NAV_LIST.map((c) => [c.dbSlug, c.href])
);
