import { getSupabasePublic } from './supabase/public';
import { getSiteImageUrl } from './supabase/storage';

export type StudentWork = {
  id: string;
  name: string;
  role: string;
  project_title: string;
  tool: string;
  category: string;
  description: string;
  image_url: string | null;
  portfolio_url: string | null;
};

export type Publication = {
  id: string;
  author_name: string;
  author_role: string;
  author_photo_url: string | null;
  title: string;
  magazine: string;
  pub_month: string | null;
  pub_year: number;
  description: string;
  article_url: string | null;
};

export type Partner = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  type: string;
  display_order: number;
};

export async function getStudentWork(): Promise<StudentWork[]> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('student_work')
      .select('id,name,role,project_title,tool,category,description,image_url,portfolio_url')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => ({
      ...r,
      image_url: r.image_url ? getSiteImageUrl(`student-work/${r.image_url}`) : null,
    }));
  } catch { return []; }
}

export async function getPublications(): Promise<Publication[]> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('publications')
      .select('id,author_name,author_role,author_photo_url,title,magazine,pub_month,pub_year,description,article_url')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('pub_year', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => ({
      ...r,
      author_photo_url: r.author_photo_url ? `/assets/partners/${r.author_photo_url}` : null,
    }));
  } catch { return []; }
}

export type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  institution: string | null;
  quote: string;
  rating: number | null;
};

export async function getRandomTestimonial(): Promise<Testimonial | null> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('testimonials')
      .select('id,name,role,institution,quote,rating')
      .eq('status', 'approved')
      .is('deleted_at', null);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  } catch { return null; }
}

// Homepage spotlight: a handful of approved testimonials to rotate through,
// rather than a single static one. Shuffled server-side on each request.
export async function getFeaturedTestimonials(limit = 4): Promise<Testimonial[]> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('testimonials')
      .select('id,name,role,institution,quote,rating')
      .eq('status', 'approved')
      .is('deleted_at', null);
    if (error) throw error;
    if (!data || data.length === 0) return [];
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, limit);
  } catch { return []; }
}

// For the LocalBusiness aggregateRating structured-data field -- only
// ever real, current numbers pulled straight from approved
// testimonials, never a hardcoded snapshot. Google's own guidance is
// explicit that marked-up rating data must match what's genuinely
// true and visible; a static number would drift out of sync the
// moment a new testimonial gets approved. Returns null when there's
// no rated testimonial yet, so the caller can leave aggregateRating
// out entirely rather than claim a rating that doesn't exist.
export async function getTestimonialAggregate(): Promise<{ count: number; average: number } | null> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('testimonials')
      .select('rating')
      .eq('status', 'approved')
      .is('deleted_at', null)
      .not('rating', 'is', null);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const sum = data.reduce((s, t) => s + Number(t.rating), 0);
    return { count: data.length, average: Math.round((sum / data.length) * 10) / 10 };
  } catch { return null; }
}

export async function getPartners(): Promise<Partner[]> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('partners')
      .select('id,name,description,logo_url,type,display_order')
      .eq('active', true)
      .is('deleted_at', null)
      .order('display_order');
    if (error) throw error;
    return (data ?? []).map(r => ({
      ...r,
      logo_url: r.logo_url ? `/assets/partners/${r.logo_url}` : null,
    }));
  } catch { return []; }
}
