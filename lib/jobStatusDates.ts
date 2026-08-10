import type { SupabaseClient } from '@supabase/supabase-js';
import type { JobRow } from './jobsExport';

// Looks up each job's most recent job_status_events row and attaches its
// created_at as status_date -- "the date this job entered its current
// status", used for the Status Date column in exports. One query for
// however many jobs are being exported rather than one per job.
export async function attachStatusDates<T extends { id: string }>(
  supabase: SupabaseClient,
  jobs: T[]
): Promise<(T & Pick<JobRow, 'status_date'>)[]> {
  if (jobs.length === 0) return [];

  const jobIds = jobs.map((j) => j.id);
  const { data: events } = await supabase
    .from('job_status_events')
    .select('job_id, created_at')
    .in('job_id', jobIds)
    .order('created_at', { ascending: false });

  const latestByJob = new Map<string, string>();
  (events ?? []).forEach((ev) => {
    if (!latestByJob.has(ev.job_id)) latestByJob.set(ev.job_id, ev.created_at);
  });

  return jobs.map((j) => ({ ...j, status_date: latestByJob.get(j.id) ?? null }));
}
