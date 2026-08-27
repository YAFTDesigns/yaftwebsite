import LabsClient from './LabsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function LabsPage() {
  const supabase = getSupabaseAdmin();
  const [{ data: scripts }, { data: categories }] = await Promise.all([
    supabase.from('lab_scripts').select('*').is('deleted_at', null).order('display_order'),
    supabase.from('lab_categories').select('*').order('display_order'),
  ]);
  return <LabsClient initialScripts={scripts ?? []} initialCategories={categories ?? []} />;
}
