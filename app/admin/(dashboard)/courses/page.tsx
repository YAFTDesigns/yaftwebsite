import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { COURSE_DETAIL_PAGES } from '@/app/courses/courseNav';
import CoursesClient, { type CourseRow } from './CoursesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const { data, error } = await getSupabaseAdmin()
    .from('courses')
    .select('slug, title, tool, level, duration, description, image_path, active')
    .order('created_at');

  const rows: CourseRow[] = (data ?? []).map((c) => ({
    slug: c.slug,
    title: c.title ?? '',
    tool: c.tool ?? '',
    level: c.level ?? '',
    duration: c.duration ?? '',
    description: c.description ?? '',
    image_path: c.image_path ?? null,
    active: !!c.active,
    href: COURSE_DETAIL_PAGES[c.slug] ?? '/courses',
  }));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 6 }}>Courses</h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
        Edits the course cards on /courses. Each course&apos;s full detail page (schedule, fees, FAQs) is separate and still changes through code.
      </p>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#777', marginBottom: 28 }}>
        Unpublishing hides the card from /courses only; the detail page stays reachable by its direct link.
      </p>
      {error && <p style={{ color: '#e55', fontFamily: 'var(--mono)', fontSize: 13 }}>Failed to load: {error.message}</p>}
      <CoursesClient initialRows={rows} />
    </div>
  );
}
