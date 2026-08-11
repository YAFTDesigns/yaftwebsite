import TeamClient from './TeamClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('team_members').select('*').is('deleted_at', null).order('name', { ascending: true });
  return <TeamClient initialTeam={data ?? []} />;
}
