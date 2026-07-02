import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { popEnquiriesFromQueue, pushEnquiryToQueue, getQueueLength, popInvoicesFromQueue, pushInvoiceToQueue, getInvoiceQueueLength } from '@/lib/queue';
import { upsertLead } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// Called by Vercel cron every 5 minutes
// Also callable manually from admin
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';

  // Allow Vercel cron (x-vercel-cron) or manual call with secret
  const isVercelCron  = request.headers.get('x-vercel-cron') === '1';
  const isManualCall  = authHeader === `Bearer ${cronSecret}` && cronSecret.length > 0;

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const queueLength = await getQueueLength();
  if (queueLength === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Queue empty' });
  }

  const supabase  = getSupabaseAdmin();
  const enquiries = await popEnquiriesFromQueue(20);
  let processed   = 0;
  let requeued    = 0;

  for (const enq of enquiries) {
    try {
      // Try saving to Supabase
      const leadId = await upsertLead(supabase, { email: enq.email, name: enq.name, source: 'contact_form' });

      const { data, error } = await supabase
        .from('enquiries')
        .insert({
          lead_id:         leadId,
          name:            enq.name,
          email:           enq.email,
          course_interest: enq.interest || null,
          message:         enq.message,
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log(`[retry] Saved queued enquiry: ${enq.email}`);
      processed++;
    } catch (err) {
      console.error(`[retry] Still failing for ${enq.email}:`, err);
      // Put back in queue for next retry
      await pushEnquiryToQueue(enq);
      requeued++;
    }
  }

  return NextResponse.json({ ok: true, processed, requeued });
}

async function retryInvoices(supabase: ReturnType<typeof import('@/lib/supabase/admin').getSupabaseAdmin>) {
  const invoices = await popInvoicesFromQueue(20);
  let processed  = 0;
  let requeued   = 0;

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
      console.log(\`[retry] Saved queued invoice: \${inv.invoice_no}\`);
      processed++;
    } catch (err) {
      console.error(\`[retry] Invoice still failing \${inv.invoice_no}:\`, err);
      await pushInvoiceToQueue(inv);
      requeued++;
    }
  }
  return { processed, requeued };
}

export async function GET() {
  const [enquiryQueue, invoiceQueue] = await Promise.all([
    getQueueLength(),
    getInvoiceQueueLength(),
  ]);
  return NextResponse.json({ enquiryQueue, invoiceQueue });
}
