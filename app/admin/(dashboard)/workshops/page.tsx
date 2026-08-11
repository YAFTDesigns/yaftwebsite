import WorkshopsClient from './WorkshopsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function WorkshopsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('workshops').select('*').order('display_order');
  return <WorkshopsClient initialWorkshops={data ?? []} />;
}
