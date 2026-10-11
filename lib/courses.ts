import { getSupabasePublic } from './supabase/public';
import { getSiteImageUrl } from './supabase/storage';
import { assetUrl, localAssetToUrl } from '@/lib/assetUrl';

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

// pdf_storage_path (as stored in the courses table) -> object name in the "syllabus" bucket.
const SYLLABUS_BUCKET_FILES: Record<string, string> = {
  'grasshopper-architecture.pdf': 'Grasshopper_Training_for_Architecture.pdf',
  'revit-rhino-inside.pdf': 'Revit_Architecture_Rhino_Insider.pdf',
  'rhino-aec-climate.pdf': 'Rhino_3D_Training_for_AEC_for_Climate.pdf',
  'rhino-architecture.pdf': 'Rhino_3D_Training_for_Architecture.pdf',
  'rhino-industrial-design.pdf': 'Rhino_3D_Training_for_Industrial_Design.pdf',
};

function syllabusPdfUrl(path: string): string {
  const inBucket = SYLLABUS_BUCKET_FILES[path];
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (inBucket && base) return `${base}/storage/v1/object/public/syllabus/${inBucket}`;
  return assetUrl(`pdfs/${path}`);
}

function toCourse(row: CourseRow): Course {
  return {
    slug: row.slug,
    image: row.image_path ? (row.image_path.startsWith('/') ? localAssetToUrl(row.image_path) : getSiteImageUrl(row.image_path)) : '',
    alt: row.title,
    level: row.level ?? '',
    duration: row.duration ?? '',
    tool: row.tool ?? '',
    title: row.title,
    desc: row.description ?? '',
    // Syllabus PDFs live in the public Supabase "syllabus" bucket (keeps every Vercel deployment small).
    // Any PDF not in the syllabus bucket is served from the public-assets bucket.
    pdf: row.pdf_storage_path ? syllabusPdfUrl(row.pdf_storage_path) : '',
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
