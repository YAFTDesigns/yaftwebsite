import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cronAuth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, isEmailConfigured, getNotificationBcc } from '@/lib/email';
import { getErrorMessage } from '@/lib/errorMessage';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { getCronControl, DISABLED_RESPONSE } from '@/lib/cronControls';
import {
  MAX_FAILED_ATTEMPTS,
  buildFollowUpEmail,
  isJunkEmail,
  rankCandidates,
  selectionReason,
  summariseFollowUpLogs,
} from '@/lib/leadFollowUp';

export const dynamic = 'force-dynamic';

const JOB = 'lead-follow-up' as const;
const FOLLOW_UP_TEMPLATE = 'lead_follow_up';
const MIN_DAYS_SINCE_LAST_CONTACT = 3;
const MAX_DAYS_SINCE_LAST_CONTACT = 30;

// One follow-up per lead, ever, and only to leads that are:
//   status 'new', not declined, active 3-30 days ago, not a junk/test
//   address, and never bounced/complained on ANY earlier email.
// A send only counts as "done" if it actually went out; a failed attempt
// is retried (at most MAX_FAILED_ATTEMPTS times) instead of excluding the
// lead forever. The per-job control row can additionally restrict sends to
// an approved list and a lifetime cap, and switches itself off at the cap.
async function runFollowUpCheck({ dryRun, viaScheduler }: { dryRun: boolean; viaScheduler: boolean }) {
  const supabase = getSupabaseAdmin();
  const control = await getCronControl(supabase, JOB);

  // The scheduler may only act when the job is switched on. A manual admin
  // run or a dry run is an explicit human action, so it is not blocked by
  // the switch (but still honours the approved list and the cap).
  if (viaScheduler && !control.enabled) return { ...DISABLED_RESPONSE };
  if (!dryRun && !isEmailConfigured()) return { sent: 0, skipped: 'email not configured' };

  const now = Date.now();
  const newest = new Date(now - MIN_DAYS_SINCE_LAST_CONTACT * 86_400_000).toISOString();
  const oldest = new Date(now - MAX_DAYS_SINCE_LAST_CONTACT * 86_400_000).toISOString();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, email, name, source, status, last_seen')
    .eq('declined', false)
    .eq('status', 'new')
    .not('email', 'is', null)
    .gte('last_seen', oldest)
    .lte('last_seen', newest);
  if (error) {
    console.error('[lead-follow-up] failed to load candidate leads:', error);
    return { sent: 0, error: error.message };
  }

  // Suppression: anyone who ever bounced or complained, on any template.
  const { data: suppressedRows } = await supabase
    .from('email_logs')
    .select('to_email')
    .in('status', ['bounced', 'complained']);
  const suppressed = new Set((suppressedRows ?? []).map((r) => String(r.to_email).trim().toLowerCase()));

  const { data: logRows } = await supabase
    .from('email_logs')
    .select('to_email, status')
    .eq('template', FOLLOW_UP_TEMPLATE);
  const { done, failed } = summariseFollowUpLogs(logRows ?? []);
  const sentSoFar = done.size;

  const approved = control.approved_emails && control.approved_emails.length > 0 ? new Set(control.approved_emails) : null;

  const excluded: Record<string, number> = {};
  const bump = (k: string) => { excluded[k] = (excluded[k] ?? 0) + 1; };

  type Cand = { id: string; email: string; name: string | null; source: string; status: string; last_seen: string; course_interest: string | null };
  const eligible: Cand[] = [];
  for (const l of leads ?? []) {
    const email = String(l.email).trim().toLowerCase();
    if (isJunkEmail(email)) { bump('junk_or_test_address'); continue; }
    if (suppressed.has(email)) { bump('bounced_or_complained'); continue; }
    if (done.has(email)) { bump('already_followed_up'); continue; }
    if ((failed.get(email) ?? 0) >= MAX_FAILED_ATTEMPTS) { bump('failed_too_many_times'); continue; }
    if (approved && !approved.has(email)) { bump('not_on_approved_list'); continue; }
    const { data: lastEnquiry } = await supabase
      .from('enquiries')
      .select('course_interest')
      .eq('lead_id', l.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    eligible.push({ id: l.id, email, name: l.name, source: l.source, status: l.status, last_seen: l.last_seen, course_interest: lastEnquiry?.course_interest ?? null });
  }

  const ranked = rankCandidates(eligible);
  const cap = control.max_total_sends;
  const remaining = cap === null ? Number.POSITIVE_INFINITY : Math.max(0, cap - sentSoFar);
  const batch = ranked.slice(0, Number.isFinite(remaining) ? remaining : ranked.length);

  const preview = batch.map((c) => {
    const mail = buildFollowUpEmail(c);
    return {
      email: c.email,
      name: c.name,
      source: c.source,
      last_activity: c.last_seen.slice(0, 10),
      status: c.status,
      course_interest: c.course_interest,
      selection_reason: selectionReason(c, now),
      subject: mail.subject,
    };
  });

  const summary = {
    dry_run: dryRun,
    control: { enabled: control.enabled, max_total_sends: cap, approved_list_size: approved?.size ?? null },
    sent_so_far: sentSoFar,
    remaining_under_cap: Number.isFinite(remaining) ? remaining : null,
    eligible_before_cap: ranked.length,
    excluded,
  };

  if (dryRun) return { ...summary, would_send: preview.length, recipients: preview };
  if (batch.length === 0) return { ...summary, sent: 0, skipped: 'no eligible recipients' };

  let sent = 0;
  const results: string[] = [];
  for (const c of batch) {
    const { subject, html } = buildFollowUpEmail(c);
    let status = 'sent';
    let errMsg: string | null = null;
    let resendEmailId: string | null = null;
    try {
      const result = await sendEmail({ to: c.name ? `${c.name} <${c.email}>` : c.email, subject, html, bcc: getNotificationBcc() });
      resendEmailId = result.id;
      sent++;
    } catch (mailErr) {
      status = 'failed';
      errMsg = getErrorMessage(mailErr);
      console.error('[lead-follow-up] send failed for', c.email, mailErr);
    }
    await supabase.from('email_logs').insert({
      to_email: c.email,
      to_name: c.name,
      subject,
      template: FOLLOW_UP_TEMPLATE,
      status,
      error: errMsg,
      resend_email_id: resendEmailId,
    });
    results.push(`${c.email}: ${status}`);
  }

  // Pilot pause: once the lifetime cap is reached the job switches itself off.
  let pausedAtCap = false;
  if (cap !== null && sentSoFar + sent >= cap) {
    await supabase
      .from('cron_job_controls')
      .update({ enabled: false, updated_at: new Date().toISOString(), updated_by: 'auto: lifetime cap reached' })
      .eq('job', JOB);
    pausedAtCap = true;
  }

  return { ...summary, sent, results, paused_at_cap: pausedAtCap };
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runFollowUpCheck({ dryRun: false, viaScheduler: true });
  return NextResponse.json(result);
}

// Admin-only. ?dry_run=1 previews recipients and sends nothing.
export async function POST(request: Request) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get('dry_run') === '1';
  const result = await runFollowUpCheck({ dryRun, viaScheduler: false });
  return NextResponse.json(result);
}
