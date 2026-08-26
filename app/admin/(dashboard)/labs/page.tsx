import LabsClient from './LabsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function LabsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('lab_scripts').select('*').order('display_order');
  return <LabsClient initialScripts={data ?? []} />;
}
