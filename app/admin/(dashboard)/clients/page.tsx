import ClientsClient from './ClientsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Fetches clients server-side (all, active+inactive, since the page has
// a "Show inactive" toggle client-side) so first paint already has
// content instead of an empty shell + client fetch after hydration.
export default async function ClientsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('clients').select('*').is('deleted_at', null).order('name', { ascending: true });
  return <ClientsClient initialClients={data ?? []} />;
}
