import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { peekEnquiryQueue, peekInvoiceQueue } from '@/lib/queue';
import AutomationClient, { type AutomationData } from './AutomationClient';

export const dynamic = 'force-dynamic';

export default async function AdminAutomationPage() {
  const supabase = getSupabaseAdmin();
  const { data: controls } = await supabase.from('cron_job_controls').select('*').order('job');

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

  const { data: due } = await supabase
    .from('invoices')
    .select('invoice_no, client_name, client_email, scheduled_send_at')
    .is('deleted_at', null)
    .is('email_sent_at', null)
    .eq('send_cancelled', false)
    .not('scheduled_send_at', 'is', null)
    .lte('scheduled_send_at', new Date().toISOString());

  const initial: AutomationData = { controls: (controls ?? []) as AutomationData['controls'], queues, due_scheduled_invoices: due ?? [] };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, marginBottom: 6 }}>Automation</h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 28 }}>
        Each scheduled job has its own switch. All start off. Switching a job on lets the scheduler run it; it does not depend on any shared secret.
      </p>
      <AutomationClient initial={initial} />
    </div>
  );
}
