import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  popEnquiriesFromQueue, pushEnquiryToQueue,
  popInvoicesFromQueue,  pushInvoiceToQueue,
} from '@/lib/queue';
import { upsertLead } from '@/lib/leads';
import { sendAdminAlert } from '@/lib/adminAlert';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

// IMPORTANT: this route deliberately lives OUTSIDE /api/admin/* .
// proxy.ts's admin-auth middleware matches /api/admin/:path* and
// rejects any request without an admin login session -- which a
// Vercel Cron invocation never has. Vercel Cron also always sends a
// GET request, not POST, regardless of what's configured in
// vercel.json. Putting the real logic behind POST at an /api/admin/
// path (the original implementation) meant this retry job could
// never have run automatically: it would 401 at the middleware layer
// before even reaching this file, and even if it got through, Cron's
// GET would have hit a route that only had a POST handler.
async function runRetry() {
  const supabase = getSupabaseAdmin();

  // ── Retry enquiries ──────────────────────────────────────────────
  const enquiries = await popEnquiriesFromQueue(20);
  let eProcessed  = 0;
  let eRequeued   = 0;
  const enquiryErrors: string[] = [];

  for (const enq of enquiries) {
    try {
      const leadId = await upsertLead(supabase, {
        email:  enq.email,
        name:   enq.name,
        source: 'contact_form',
      });
      const { error } = await supabase
        .from('enquiries')
        .insert({
          lead_id:         leadId,
          name:            enq.name,
          email:           enq.email,
          course_interest: enq.interest || null,
          message:         enq.message,
        });
      if (error) throw error;
      eProcessed++;
    } catch (err: any) {
      await pushEnquiryToQueue(enq);
      eRequeued++;
      enquiryErrors.push(`${enq.email}: ${err?.message ?? String(err)}`);
    }
  }

  // ── Retry invoices ───────────────────────────────────────────────
  const invoices  = await popInvoicesFromQueue(20);
  let iProcessed  = 0;
  let iRequeued   = 0;
  const invoiceErrors: string[] = [];

  for (const inv of invoices) {
    try {
      const { data: reinserted, error } = await supabase.from('invoices').insert({
        invoice_no:   inv.invoice_no,
        date:         inv.date,
        client_name:  inv.client_name,
        client_email: inv.client_email,
        client_type:  inv.client_type,
        client_company: inv.client_company,
        client_pan:   inv.client_pan,
        client_gst:   inv.client_gst,
        client_state: inv.client_state,
        client_address: inv.client_address,
        client_phone:   inv.client_phone,
        items:        inv.items,
        total:        inv.total,
        advance:      inv.advance,
        balance:      inv.balance,
        invoice_type: inv.invoice_type,
        status:       'sent',
      }).select('id').single();
      if (error) throw error;
      iProcessed++;
      await logInvoiceEvent({
        invoiceId: reinserted?.id, invoiceNo: inv.invoice_no, event: 'recovered',
        message: 'Recovered from retry queue',
      });
    } catch (err: any) {
      await pushInvoiceToQueue(inv);
      iRequeued++;
      const msg = err?.message ?? String(err);
      invoiceErrors.push(`${inv.invoice_no} (${inv.client_email}): ${msg}`);
      await logInvoiceEvent({
        invoiceNo: inv.invoice_no, event: 'retry_failed',
        message: `Retry failed — ${msg}`,
        meta: { error: msg },
      });
    }
  }

  // A retry job failure means the item already failed once live AND
  // again here -- that's a persistent problem (schema drift, bad env
  // var, etc.), not a transient blip. Worth a human looking at it.
  if (eRequeued > 0 || iRequeued > 0) {
    const rows = [
      ...enquiryErrors.map(e => `<li><b>Enquiry</b> — ${e}</li>`),
      ...invoiceErrors.map(e => `<li><b>Invoice</b> — ${e}</li>`),
    ].join('');
    await sendAdminAlert(
      `YAFT Site Alert: ${eRequeued + iRequeued} item(s) still failing to save`,
      `<p>The retry job tried these and they failed again -- they're still queued and will be retried on the next run, but this usually means something needs a manual fix (e.g. a missing DB column or migration).</p><ul>${rows}</ul>`
    );
  }

  return {
    ok: true,
    enquiries: { processed: eProcessed, requeued: eRequeued },
    invoices:  { processed: iProcessed, requeued: iRequeued },
  };
}

// GET — this is what Vercel Cron actually calls (per vercel.json).
// Also accepts a manual Bearer CRON_SECRET call for testing outside
// the Vercel platform.
export async function GET(request: Request) {
  const authHeader   = request.headers.get('authorization');
  const cronSecret   = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = cronSecret.length > 0 && authHeader === ('Bearer ' + cronSecret);

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runRetry();
  return NextResponse.json(result);
}

// POST — manual "run now" trigger from the admin UI. Checked against
// the admin session directly (this route isn't covered by the
// /api/admin/:path* proxy matcher, so it isn't gated there).
export async function POST() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runRetry();
  return NextResponse.json(result);
}
