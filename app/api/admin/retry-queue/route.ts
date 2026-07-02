import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  popEnquiriesFromQueue, pushEnquiryToQueue, getQueueLength,
  popInvoicesFromQueue,  pushInvoiceToQueue,  getInvoiceQueueLength,
} from '@/lib/queue';
import { upsertLead } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader  = request.headers.get('authorization');
  const cronSecret  = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = authHeader === ('Bearer ' + cronSecret) && cronSecret.length > 0;

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // ── Retry enquiries ──────────────────────────────────────────────
  const enquiries = await popEnquiriesFromQueue(20);
  let eProcessed  = 0;
  let eRequeued   = 0;

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
    } catch {
      await pushEnquiryToQueue(enq);
      eRequeued++;
    }
  }

  // ── Retry invoices ───────────────────────────────────────────────
  const invoices  = await popInvoicesFromQueue(20);
  let iProcessed  = 0;
  let iRequeued   = 0;

  for (const inv of invoices) {
    try {
      const { error } = await supabase.from('invoices').insert({
        invoice_no:   inv.invoice_no,
        date:         inv.date,
        client_name:  inv.client_name,
        client_email: inv.client_email,
        client_type:  inv.client_type,
        client_pan:   inv.client_pan,
        client_gst:   inv.client_gst,
        client_state: inv.client_state,
        items:        inv.items,
        total:        inv.total,
        advance:      inv.advance,
        balance:      inv.balance,
        status:       'sent',
      });
      if (error) throw error;
      iProcessed++;
    } catch {
      await pushInvoiceToQueue(inv);
      iRequeued++;
    }
  }

  return NextResponse.json({
    ok: true,
    enquiries: { processed: eProcessed, requeued: eRequeued },
    invoices:  { processed: iProcessed, requeued: iRequeued },
  });
}

export async function GET() {
  const [enquiryQueue, invoiceQueue] = await Promise.all([
    getQueueLength(),
    getInvoiceQueueLength(),
  ]);
  return NextResponse.json({ enquiryQueue, invoiceQueue });
}
