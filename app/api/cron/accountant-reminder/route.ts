import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminAlert } from '@/lib/adminAlert';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

// Deliberately a reminder, not a full send -- Yokes prefers to review
// and send the accountant email himself rather than have it go out
// automatically. This just makes sure month-end doesn't slip by
// unnoticed. Runs daily; the logic below decides on each run whether
// today is actually a day worth nagging about, most days it's a no-op.
async function runReminderCheck() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const dayOfMonth = now.getDate();
  const daysInThisMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = daysInThisMonth - dayOfMonth;

  const thisMonthStart = new Date(year, month, 1).toISOString();
  const lastMonthStart = new Date(year, month - 1, 1).toISOString();
  const lastMonthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const thisMonthLabel = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Two separate situations this checks for:
  // 1. Nearing month-end (last 5 days) and this month's batch hasn't
  //    gone out yet -- a heads-up while there's still time.
  // 2. Early in a new month (first 3 days) and LAST month's batch
  //    never went out at all -- a "this one got missed" alert.
  const nearingMonthEnd = daysRemaining <= 5;
  const earlyInNewMonth = dayOfMonth <= 3;

  if (!nearingMonthEnd && !earlyInNewMonth) {
    return { sent: false, reason: 'not a reminder day' };
  }

  const checks: { label: string; rangeStart: string; rangeEnd: string; isMissed: boolean }[] = [];
  if (nearingMonthEnd) {
    checks.push({ label: thisMonthLabel, rangeStart: thisMonthStart, rangeEnd: new Date(year, month + 1, 1).toISOString(), isMissed: false });
  }
  if (earlyInNewMonth) {
    checks.push({ label: lastMonthLabel, rangeStart: lastMonthStart, rangeEnd: thisMonthStart, isMissed: true });
  }

  const results: string[] = [];

  for (const check of checks) {
    // Was the accountant actually emailed for this month already?
    const { count: sentCount } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('template', 'selected_invoices_export')
      .gte('created_at', check.rangeStart)
      .lt('created_at', check.rangeEnd);

    if ((sentCount ?? 0) > 0) continue; // already sent for this month, nothing to remind about

    // Was a reminder already sent for this exact situation? Prevents
    // nagging daily throughout the last-5-days window or the first-3-
    // days window -- once per month per situation is enough.
    const reminderTemplate = check.isMissed ? 'accountant_reminder_missed' : 'accountant_reminder_upcoming';
    const { count: reminderAlreadySent } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('template', reminderTemplate)
      .gte('created_at', check.isMissed ? thisMonthStart : check.rangeStart)
      .lt('created_at', check.isMissed ? new Date(year, month + 1, 1).toISOString() : check.rangeEnd);

    if ((reminderAlreadySent ?? 0) > 0) continue;

    // Real invoice data for that month, so the reminder is actually
    // useful, not just a vague nag.
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total')
      .is('deleted_at', null)
      .neq('invoice_type', 'proforma')
      .gte('created_at', check.rangeStart)
      .lt('created_at', check.rangeEnd);

    const count = invoices?.length ?? 0;
    if (count === 0) continue; // nothing to send, nothing to remind about

    const total = (invoices ?? []).reduce((s, i) => s + Number(i.total), 0);
    const subject = check.isMissed
      ? `Reminder: ${check.label} invoices weren't sent to your accountant`
      : `Heads up: ${check.label} invoices still waiting to go to your accountant`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;">
      <p style="font-size:14px;line-height:1.8;">${check.isMissed
        ? `Looks like <strong>${check.label}</strong>'s invoices never got emailed to your accountant.`
        : `<strong>${check.label}</strong> is ending soon and this month's invoices haven't been sent to your accountant yet.`}</p>
      <p style="font-size:14px;line-height:1.8;"><strong>${count} invoice${count === 1 ? '' : 's'}</strong>, total <strong>INR ${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>, ready whenever you are on the Home page.</p>
    </div>`;

    await sendAdminAlert(subject, html);
    await supabase.from('email_logs').insert({
      to_email: 'yaftdesigns@gmail.com',
      to_name: 'Yokes',
      subject,
      template: reminderTemplate,
      status: 'sent',
    });
    results.push(`${reminderTemplate}: ${check.label} (${count} invoices)`);
  }

  return { sent: results.length > 0, results };
}

// GET -- what Vercel Cron actually calls. Same auth pattern as the
// existing retry-queue cron: this route lives outside /api/admin/*
// deliberately, since that path prefix is gated by proxy.ts's admin-
// session middleware, which a Cron invocation never has, and Cron
// always sends GET regardless of what's configured in vercel.json.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = cronSecret.length > 0 && authHeader === ('Bearer ' + cronSecret);

  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runReminderCheck();
  return NextResponse.json(result);
}

// POST -- manual "run now" trigger, checked against the admin session
// directly (this route isn't covered by the /api/admin/:path* proxy
// matcher, so it isn't gated there automatically).
export async function POST() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runReminderCheck();
  return NextResponse.json(result);
}
