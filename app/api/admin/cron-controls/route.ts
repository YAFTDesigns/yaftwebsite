import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { CRON_JOBS, type CronJob } from '@/lib/cronControls';
import { peekEnquiryQueue, peekInvoiceQueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';

// GET: every job's control row, plus a read-only look at what the retry
// queue and the scheduled-invoice job WOULD act on. Nothing is removed,
// sent or changed.
export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();

  const { data: controls, error } = await supabase.from('cron_job_controls').select('*').order('job');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let queues: unknown;
  try {
    const [enq, inv] = await Promise.all([peekEnquiryQueue(50), peekInvoiceQueue(50)]);
    queues = {
      enquiries: enq.map((e) => ({ name: e.name, email: e.email, interest: e.interest, queuedAt: e.queuedAt })),
      invoices: inv.map((i) => ({ invoice_no: i.invoice_no, client_name: i.client_name, client_email: i.client_email, total: i.total, queuedAt: i.queuedAt })),
    };
  } catch (e) {
    queues = { error: e instanceof Error ? e.message : 'queue unavailable' };
  }

  const { data: dueInvoices } = await supabase
    .from('invoices')
    .select('invoice_no, client_name, client_email, scheduled_send_at')
    .is('deleted_at', null)
    .is('email_sent_at', null)
    .eq('send_cancelled', false)
    .not('scheduled_send_at', 'is', null)
    .lte('scheduled_send_at', new Date().toISOString());

  return NextResponse.json({ controls, queues, due_scheduled_invoices: dueInvoices ?? [] });
}

// PATCH { job, enabled?, max_total_sends?, approved_emails? }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const job = body?.job as CronJob | undefined;
  if (!job || !CRON_JOBS.includes(job)) return NextResponse.json({ error: 'Unknown job' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: 'admin' };
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
    update.enabled = body.enabled;
  }
  if (body.max_total_sends !== undefined) {
    const n = body.max_total_sends;
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 10000)) return NextResponse.json({ error: 'max_total_sends must be a whole number or null' }, { status: 400 });
    update.max_total_sends = n;
  }
  if (body.approved_emails !== undefined) {
    if (body.approved_emails === null) update.approved_emails = null;
    else if (Array.isArray(body.approved_emails) && body.approved_emails.length <= 500 && body.approved_emails.every((e: unknown) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))) {
      update.approved_emails = body.approved_emails.map((e: string) => e.trim().toLowerCase());
    } else return NextResponse.json({ error: 'approved_emails must be a list of valid emails or null' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin().from('cron_job_controls').update(update).eq('job', job).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ control: data });
}
