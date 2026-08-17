import { getSupabasePublic } from './supabase/public';
import { getSiteImageUrl } from './supabase/storage';

export type Course = {
  slug: string;
  image: string;
  alt: string;
  level: string;
  duration: string;
  tool: string;
  title: string;
  desc: string;
  pdf: string;
  updatedAt: string;
};

type CourseRow = {
  slug: string;
  title: string;
  tool: string | null;
  level: string | null;
  duration: string | null;
  description: string | null;
  image_path: string | null;
  pdf_storage_path: string | null;
  updated_at: string;
};

const COLUMNS = 'slug, title, tool, level, duration, description, image_path, pdf_storage_path, updated_at';

function toCourse(row: CourseRow): Course {
  return {
    slug: row.slug,
    image: row.image_path ? getSiteImageUrl(row.image_path) : '',
    alt: row.title,
    level: row.level ?? '',
    duration: row.duration ?? '',
    tool: row.tool ?? '',
    title: row.title,
    desc: row.description ?? '',
    // Phase 1: PDFs are still served from /public. Phase 2 swaps this for a
    // signed Supabase Storage URL built from the same pdf_storage_path.
    pdf: row.pdf_storage_path ? `/assets/pdfs/${row.pdf_storage_path}` : '',
    updatedAt: row.updated_at,
  };
}

export async function getCourses(): Promise<Course[]> {
  const supabase = getSupabasePublic();
  try {
    const { data, error } = await supabase
      .from('courses')
      .select(COLUMNS)
      .eq('active', true)
      .order('created_at');

    if (error) {
      console.error('[courses] getCourses query failed:', error.message);
      return [];
    }
    return (data ?? []).map(toCourse);
  } catch (err) {
    // A transient Supabase failure previously crashed /courses (and every
    // page that lists courses) with an unhandled 500 -- confirmed via a
    // local resilience test that simulated the DB being unreachable.
    // /courses already has FALLBACK_COURSES ready for an empty result;
    // this is what lets that fallback actually run instead of the whole
    // page going down over one flaky query.
    console.error('[courses] getCourses query threw:', err);
    return [];
  }
}

export async function getCourseBySlug(slug: string): Promise<Course | undefined> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from('courses')
    .select(COLUMNS)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  return data ? toCourse(data) : undefined;
}
