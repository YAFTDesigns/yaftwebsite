import type { SupabaseClient } from '@supabase/supabase-js';

export const CRON_JOBS = [
  'lead-follow-up',
  'testimonial-request',
  'balance-reminder',
  'accountant-reminder',
  'send-scheduled-invoices',
  'retry-queue',
] as const;
export type CronJob = (typeof CRON_JOBS)[number];

export type CronControl = {
  job: CronJob;
  enabled: boolean;
  max_total_sends: number | null;
  approved_emails: string[] | null;
  notes: string | null;
  updated_at: string | null;
  updated_by: string | null;
};

// Fails CLOSED: a missing row, a read error or anything unexpected means
// the job is treated as disabled, so a problem here can never cause a send.
export async function getCronControl(supabase: SupabaseClient, job: CronJob): Promise<CronControl> {
  const disabled: CronControl = {
    job, enabled: false, max_total_sends: null, approved_emails: null,
    notes: null, updated_at: null, updated_by: null,
  };
  try {
    const { data, error } = await supabase.from('cron_job_controls').select('*').eq('job', job).maybeSingle();
    if (error || !data) return disabled;
    return {
      ...data,
      enabled: data.enabled === true,
      approved_emails: Array.isArray(data.approved_emails)
        ? (data.approved_emails as string[]).map((e) => e.trim().toLowerCase()).filter(Boolean)
        : null,
    } as CronControl;
  } catch {
    return disabled;
  }
}

// Standard response when the scheduler calls a job that is switched off.
export const DISABLED_RESPONSE = { skipped: 'job disabled in cron_job_controls', sent: 0 };
