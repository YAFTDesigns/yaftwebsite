import InboxClient from './InboxClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(200);
  return <InboxClient initialLogs={data ?? []} />;
}
