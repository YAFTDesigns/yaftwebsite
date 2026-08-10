import JobsClient from './JobsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { attachStatusDates } from '@/lib/jobStatusDates';

export const dynamic = 'force-dynamic';

// Fetches everything the page needs server-side (active jobs, trashed
// jobs, clients for the picker) so the first paint already has content
// instead of shipping an empty shell and firing three fetch() calls only
// after JS hydrates. JobsClient still owns refetching after mutations --
// this just removes the blank-then-spinner wait on initial load.
export default async function JobsPage() {
  const supabase = getSupabaseAdmin();

  const [jobsRes, trashRes, clientsRes] = await Promise.all([
    supabase.from('jobs').select('*').is('deleted_at', null).order('job_date', { ascending: false }),
    supabase.from('jobs').select('*').not('deleted_at', 'is', null).order('job_date', { ascending: false }),
    supabase.from('clients').select('*').eq('active', true).is('deleted_at', null).order('name', { ascending: true }),
  ]);

  const [jobsWithDates, trashWithDates] = await Promise.all([
    attachStatusDates(supabase, jobsRes.data ?? []),
    attachStatusDates(supabase, trashRes.data ?? []),
  ]);

  return (
    <JobsClient
      initialJobs={jobsWithDates}
      initialTrash={trashWithDates}
      initialClients={clientsRes.data ?? []}
    />
  );
}
