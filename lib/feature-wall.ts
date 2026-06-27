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
      .order('pub_year', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => ({
      ...r,
      author_photo_url: r.author_photo_url ? `/assets/partners/${r.author_photo_url}` : null,
    }));
  } catch { return []; }
}

export async function getPartners(): Promise<Partner[]> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('partners')
      .select('id,name,description,logo_url,type,display_order')
      .eq('active', true)
      .order('display_order');
    if (error) throw error;
    return (data ?? []).map(r => ({
      ...r,
      logo_url: r.logo_url ? `/assets/partners/${r.logo_url}` : null,
    }));
  } catch { return []; }
}
