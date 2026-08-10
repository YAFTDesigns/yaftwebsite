import ClientJobsClient from './ClientJobsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { attachStatusDates } from '@/lib/jobStatusDates';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const [clientRes, jobsRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    supabase.from('jobs').select('*').eq('client_id', id).is('deleted_at', null).order('job_date', { ascending: false }),
  ]);

  const jobsWithDates = await attachStatusDates(supabase, jobsRes.data ?? []);

  return (
    <ClientJobsClient
      clientId={id}
      initialClient={clientRes.data ?? undefined}
      initialJobs={jobsWithDates}
    />
  );
}
