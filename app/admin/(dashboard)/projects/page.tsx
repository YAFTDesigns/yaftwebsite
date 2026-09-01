import ProjectsClient from './ProjectsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('portfolio_projects').select('*').is('deleted_at', null).order('display_order', { ascending: true });
  return <ProjectsClient initialItems={data ?? []} />;
}
