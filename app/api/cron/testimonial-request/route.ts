import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, isEmailConfigured, getNotificationBcc } from '@/lib/email';
import { getErrorMessage } from '@/lib/errorMessage';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const TEMPLATE = 'testimonial_request';
const MIN_DAYS_SINCE_COMPLETION = 3;

function buildEmailHtml(clientName: string, jobType: string) {
  // No first-name extraction here, deliberately -- unlike leads (real
  // people, a name split is safe), jobs.client_name/clients.name can
  // be a company with no separate contact-person field anywhere in
  // the data (confirmed directly: a real client record here has name
  // and company_name both set to the same company string). Splitting
  // on whitespace and taking the first word turned "G R Stone Impex"
  // into "Hi G," -- caught by actually rendering and looking at the
  // output, not assumed safe from the lead-follow-up template it was
  // copied from.
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Hi ${clientName},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Hope the ${jobType} work has been useful on your end. Wanted to reach out now that it's wrapped up.</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">If you have a couple of minutes, a short testimonial would genuinely help, it's one of the main ways new clients and students find us. Just a few lines on what the experience was like, plus a photo, is all it takes.</p>
  <p style="margin:0 0 20px;"><a href="https://www.yaftdesigns.com/courses#testimonial-form" style="display:inline-block;background:#E63946;color:#fff;font-size:13px;padding:10px 20px;border-radius:6px;text-decoration:none;">Share your experience &rarr;</a></p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 24px;">Either way, thanks for working with us, always happy to help again whenever you need it.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">
    YAFT Designs &middot; Authorized Rhino Training Center &middot; Coimbatore, India<br>
    <a href="https://www.yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a>
  </p>
</div>`;
}

// Fires once per completed job, not once per client -- a repeat
// client finishing a new project should still get asked about that
// specific engagement, not be silently skipped because they were
// asked once before for something else. Waits
// MIN_DAYS_SINCE_COMPLETION so the client has actually had time to
// use the deliverable before being asked to review it.
async function runTestimonialRequestCheck() {
  if (!isEmailConfigured()) return { sent: 0, skipped: 'email not configured' };

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - MIN_DAYS_SINCE_COMPLETION * 24 * 60 * 60 * 1000).toISOString();

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, client_name, job_type, client_id, updated_at')
    .is('deleted_at', null)
    .eq('status', 'Completed')
    .lte('updated_at', cutoff);

  if (error) {
    console.error('[testimonial-request] failed to load completed jobs:', error);
    return { sent: 0, error: error.message };
  }
  if (!jobs || jobs.length === 0) return { sent: 0, skipped: 'no completed jobs past the wait window' };

  let sent = 0;
  const results: string[] = [];

  for (const job of jobs) {
    if (!job.client_id) continue; // no linked client to email

    const { count: alreadySent } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('template', TEMPLATE)
      .eq('job_id', job.id);
    if ((alreadySent ?? 0) > 0) continue;

    const { data: client } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', job.client_id)
      .maybeSingle();
    if (!client?.email) continue;

    const displayName = client.name || job.client_name || 'there';
    const subject = `How was the ${job.job_type}?`;
    const html = buildEmailHtml(displayName, job.job_type);

    let status = 'sent';
    let errMsg: string | null = null;
    let resendEmailId: string | null = null;

    try {
      const result = await sendEmail({ to: `${displayName} <${client.email}>`, subject, html, bcc: getNotificationBcc() });
      resendEmailId = result.id;
      sent++;
    } catch (mailErr) {
      status = 'failed';
      errMsg = getErrorMessage(mailErr);
      console.error('[testimonial-request] send failed for', client.email, mailErr);
    }

    await supabase.from('email_logs').insert({
      to_email: client.email,
      to_name: displayName,
      subject,
      template: TEMPLATE,
      status,
      error: errMsg,
      resend_email_id: resendEmailId,
      job_id: job.id,
    });
    results.push(`${client.email} (job ${job.id}): ${status}`);
  }

  return { sent, total_candidates: jobs.length, results };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = cronSecret.length > 0 && authHeader === ('Bearer ' + cronSecret);
  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runTestimonialRequestCheck();
  return NextResponse.json(result);
}

export async function POST() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runTestimonialRequestCheck();
  return NextResponse.json(result);
}
