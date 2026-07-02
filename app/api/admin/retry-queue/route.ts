import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { popEnquiriesFromQueue, pushEnquiryToQueue, getQueueLength } from '@/lib/queue';
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
      const leadId = await upsertLead(supabase, enq.name, enq.email, enq.interest ?? '');

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

export async function GET() {
  const queueLength = await getQueueLength();
  return NextResponse.json({ queueLength });
}
