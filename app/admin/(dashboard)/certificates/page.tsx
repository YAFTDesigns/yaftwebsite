import CertificatesClient from './CertificatesClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('certificates').select('*').order('created_at', { ascending: false });
  return <CertificatesClient initialItems={data ?? []} />;
}
