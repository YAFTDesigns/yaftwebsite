import type { MetadataRoute } from 'next';
import { INSIGHT_POSTS } from '@/lib/insights';
import { getSupabasePublic } from '@/lib/supabase/public';

const BASE = 'https://www.yaftdesigns.com';
const NOW = new Date().toISOString();

const COURSE_SLUGS = [
  'rhino3d-architecture',
  'rhino3d-industrial-design',
  'rhino3d-aec-climate',
  'grasshopper-architecture',
  'revit-rhino-inside',
];

async function getActiveProjectSlugs(): Promise<{ slug: string; updated: string }[]> {
  try {
    const { data, error } = await getSupabasePublic()
      .from('portfolio_projects')
      .select('slug, created_at')
      .eq('active', true)
      .is('deleted_at', null);
    if (error || !data) return [];
    return data.map((p) => ({ slug: p.slug, updated: p.created_at ?? NOW }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projectSlugs = await getActiveProjectSlugs();

  return [
    { url: `${BASE}`,           lastModified: NOW, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/courses`,   lastModified: NOW, changeFrequency: 'weekly',  priority: 0.9 },
    ...COURSE_SLUGS.map((slug) => ({
      url: `${BASE}/courses/${slug}`, lastModified: NOW, changeFrequency: 'monthly' as const, priority: 0.85,
    })),
    { url: `${BASE}/services`,  lastModified: NOW, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/faculty`,   lastModified: NOW, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/projects`,           lastModified: NOW, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/projects/community`, lastModified: NOW, changeFrequency: 'weekly',  priority: 0.7 },
    ...projectSlugs.map(({ slug, updated }) => ({
      url: `${BASE}/projects/${slug}`, lastModified: updated, changeFrequency: 'monthly' as const, priority: 0.65,
    })),
    { url: `${BASE}/resources`,           lastModified: NOW, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/insights`,            lastModified: NOW, changeFrequency: 'weekly',  priority: 0.7 },
    ...INSIGHT_POSTS.map((post) => ({
      url: `${BASE}/insights/${post.slug}`, lastModified: post.publishedAt, changeFrequency: 'monthly' as const, priority: 0.65,
    })),
    { url: `${BASE}/certificates`, lastModified: NOW, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
