import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, isEmailConfigured, getNotificationBcc } from '@/lib/email';
import { getErrorMessage } from '@/lib/errorMessage';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const FOLLOW_UP_TEMPLATE = 'lead_follow_up';
const MIN_DAYS_SINCE_LAST_CONTACT = 3;

function buildEmailHtml(name: string | null, courseInterest: string | null) {
  const firstName = name ? (name.trim().split(/\s+/)[0] || name) : 'there';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Hi ${firstName},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">Just checking in, how have you been?</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 16px;">You reached out a little while back${courseInterest ? ` about <strong>${courseInterest}</strong>` : ' about learning with us'}, and I wanted to follow up properly rather than let it go quiet. Are you still interested in picking up computational design, Rhino, Grasshopper, and the kind of parametric workflow that lets you actually automate the repetitive parts of a project?</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">If now isn't the right time, no worries at all, just let me know. And if you'd like to get a feel for the kind of work involved before committing to anything, we've got a growing library of free Grasshopper and Rhino scripts you can download and try yourself:</p>
  <p style="margin:0 0 20px;"><a href="https://www.yaftdesigns.com/labs" style="display:inline-block;background:#E63946;color:#fff;font-size:13px;padding:10px 20px;border-radius:6px;text-decoration:none;">Browse free scripts on YAFT Labs &rarr;</a></p>
  <img src="https://www.yaftdesigns.com/assets/images/rhino-banner.png" alt="Rhinoceros, design, model, present, analyze, realize" style="width:100%;display:block;margin:0 0 20px;" />
  <p style="font-size:14px;line-height:1.8;margin:0 0 24px;">Reply to this email whenever suits you, happy to answer anything or pick up where we left off.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">
    YAFT Designs &middot; Authorized Rhino Training Center &middot; Coimbatore, India<br>
    <a href="https://www.yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a>
  </p>
</div>`;
}

// A genuine, once-per-lead follow-up -- not a drip sequence. Fires at
// most once for a given lead: after MIN_DAYS_SINCE_LAST_CONTACT with
// no further activity, skips anyone Yokes has manually marked
// declined (leads.declined -- the system has no way to detect a
// reply declining on its own), and skips anyone already sent one
// (checked via email_logs, same dedup pattern as the accountant
// reminder).
async function runFollowUpCheck() {
  if (!isEmailConfigured()) return { sent: 0, skipped: 'email not configured' };

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - MIN_DAYS_SINCE_LAST_CONTACT * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await supabase
    .from('leads')
    .select('id, email, name, last_seen, declined')
    .eq('declined', false)
    .not('email', 'is', null)
    .lte('last_seen', cutoff);

  if (error) {
    console.error('[lead-follow-up] failed to load candidate leads:', error);
    return { sent: 0, error: error.message };
  }
  if (!candidates || candidates.length === 0) return { sent: 0, skipped: 'no candidates' };

  let sent = 0;
  const results: string[] = [];

  for (const lead of candidates) {
    // Only email requires a real value -- name doesn't, roughly 70%
    // of leads have no name on file (syllabus/WhatsApp-gate captures
    // just the email), and the original guard here required both,
    // which meant this cron silently skipped every nameless lead
    // since the day it was built. Every place below that uses the
    // name now degrades gracefully instead.
    if (!lead.email) continue;

    const { count: alreadyFollowedUp } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('template', FOLLOW_UP_TEMPLATE)
      .eq('to_email', lead.email);
    if ((alreadyFollowedUp ?? 0) > 0) continue;

    // Most recent enquiry, for course_interest personalization -- best
    // effort, a missing enquiry row just means a slightly more generic
    // opening line, not a skipped follow-up.
    const { data: lastEnquiry } = await supabase
      .from('enquiries')
      .select('course_interest')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const displayName = lead.name?.trim() || null;
    const firstName = displayName ? (displayName.split(/\s+/)[0] || displayName) : 'there';
    const subject = `Hey ${firstName}, still thinking about it?`;
    const html = buildEmailHtml(displayName, lastEnquiry?.course_interest ?? null);

    let status = 'sent';
    let errMsg: string | null = null;
    let resendEmailId: string | null = null;

    try {
      const result = await sendEmail({ to: displayName ? `${displayName} <${lead.email}>` : lead.email, subject, html, bcc: getNotificationBcc() });
      resendEmailId = result.id;
      sent++;
    } catch (mailErr) {
      status = 'failed';
      errMsg = getErrorMessage(mailErr);
      console.error('[lead-follow-up] send failed for', lead.email, mailErr);
    }

    await supabase.from('email_logs').insert({
      to_email: lead.email,
      to_name: displayName,
      subject,
      template: FOLLOW_UP_TEMPLATE,
      status,
      error: errMsg,
      resend_email_id: resendEmailId,
    });
    results.push(`${lead.email}: ${status}`);
  }

  return { sent, total_candidates: candidates.length, results };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = cronSecret.length > 0 && authHeader === ('Bearer ' + cronSecret);
  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runFollowUpCheck();
  return NextResponse.json(result);
}

// Manual "run now" trigger, behind the real admin session.
export async function POST() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runFollowUpCheck();
  return NextResponse.json(result);
}
