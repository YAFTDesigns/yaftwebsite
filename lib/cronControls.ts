import type { SupabaseClient } from '@supabase/supabase-js';
import { peekEnquiryQueue, peekInvoiceQueue } from '@/lib/queue';

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

// Read-only snapshot used by the Automation page and /api/admin/cron-controls:
// every job's control row, what the retry queues hold, and scheduled invoices
// that are due. Nothing is removed, sent or changed. The three reads are
// independent, so they run together.
export async function getAutomationSnapshot(supabase: SupabaseClient) {
  const peekQueues = async (): Promise<unknown> => {
    try {
      const [enq, inv] = await Promise.all([peekEnquiryQueue(50), peekInvoiceQueue(50)]);
      return {
        enquiries: enq.map((e) => ({ name: e.name, email: e.email, interest: e.interest, queuedAt: e.queuedAt })),
        invoices: inv.map((i) => ({ invoice_no: i.invoice_no, client_name: i.client_name, client_email: i.client_email, total: i.total, queuedAt: i.queuedAt })),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'queue unavailable' };
    }
  };

  const [controlsRes, queues, dueRes] = await Promise.all([
    supabase.from('cron_job_controls').select('*').order('job'),
    peekQueues(),
    supabase
      .from('invoices')
      .select('invoice_no, client_name, client_email, scheduled_send_at')
      .is('deleted_at', null)
      .is('email_sent_at', null)
      .eq('send_cancelled', false)
      .not('scheduled_send_at', 'is', null)
      .lte('scheduled_send_at', new Date().toISOString()),
  ]);

  return { controls: controlsRes.data, controlsError: controlsRes.error, queues, due: dueRes.data ?? [] };
}
