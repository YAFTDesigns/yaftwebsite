import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendInvoiceEmail, type InvoiceForEmail } from '@/lib/invoiceEmail';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

// IMPORTANT: same reasoning as /api/cron/retry-queue -- this lives
// outside /api/admin/* (proxy.ts's admin-auth middleware would 401 a
// Vercel Cron invocation, which never carries an admin session) and
// Vercel Cron always sends GET regardless of vercel.json.
async function runScheduledSends() {
  const supabase = getSupabaseAdmin();

  const { data: due, error } = await supabase
    .from('invoices')
    .select('*')
    .is('deleted_at', null)
    .is('email_sent_at', null)
    .eq('send_cancelled', false)
    .not('scheduled_send_at', 'is', null)
    .lte('scheduled_send_at', new Date().toISOString());

  if (error) {
    console.error('[send-scheduled-invoices] fetch failed:', error);
    return { checked: 0, sent: 0, failed: 0, error: error.message };
  }

  let sent = 0;
  let failed = 0;

  for (const inv of due ?? []) {
    try {
      const emailData: InvoiceForEmail = {
        invoice_no: inv.invoice_no,
        date: inv.date,
        invoice_type: inv.invoice_type,
        client_name: inv.client_name,
        client_email: inv.client_email,
        client_type: inv.client_type,
        client_company: inv.client_company,
        client_pan: inv.client_pan,
        client_gst: inv.client_gst,
        client_state: inv.client_state,
        client_address: inv.client_address,
        client_phone: inv.client_phone,
        items: inv.items ?? [],
        advance: inv.advance,
        balance: inv.balance,
        grand_total: inv.total,
        schedule_note: inv.schedule_note,
      };

      const result = await sendInvoiceEmail(emailData);

      // Marked sent regardless of success/failure once attempted --
      // same as the immediate-send path, a failure is visible in
      // email_logs rather than retried indefinitely against a
      // permanently-bad address.
      await supabase.from('invoices').update({ email_sent_at: new Date().toISOString() }).eq('id', inv.id);

      await logInvoiceEvent({
        invoiceId: inv.id,
        invoiceNo: inv.invoice_no,
        event: result.status === 'sent' ? 'scheduled_sent' : 'scheduled_send_failed',
        message: result.status === 'sent'
          ? `Scheduled email sent to ${inv.client_email}`
          : `Scheduled email failed: ${result.errMsg}`,
      });

      if (result.status === 'sent') sent++;
      else failed++;
    } catch (err) {
      console.error('[send-scheduled-invoices] invoice', inv.id, 'threw:', err);
      failed++;
    }
  }

  return { checked: (due ?? []).length, sent, failed };
}

// GET — this is what Vercel Cron actually calls (per vercel.json).
// Also accepts a manual Bearer CRON_SECRET call for testing outside
// the Vercel platform.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = cronSecret.length > 0 && authHeader === ('Bearer ' + cronSecret);

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runScheduledSends();
  return NextResponse.json(result);
}

// POST — manual "run now" trigger from the admin UI.
export async function POST() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runScheduledSends();
  return NextResponse.json(result);
}
