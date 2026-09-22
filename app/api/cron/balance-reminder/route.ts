import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendAdminAlert } from '@/lib/adminAlert';
import { ddmmyyyyToIso } from '@/lib/invoicesExport';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const TEMPLATE = 'balance_reminder';
const MIN_DAYS_OVERDUE = 14;

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// A nudge to Yokes, not an automatic email to the client -- matches
// his stated preference for staying in the loop on any client-facing
// communication (the same reasoning behind the lead follow-up's
// declined-flag and the accountant reminder being a nudge rather than
// an auto-send). Built directly off a real pattern in his own data:
// both currently-outstanding invoices show the advance paid but the
// remainder unpaid well past when classes would have started, exactly
// the "advance gets paid, balance gets forgotten" gap this exists to
// catch. Fires once per invoice, not a repeating daily nag -- checked
// via email_logs + invoice_id, same dedup pattern as every other
// reminder cron this session.
async function runBalanceReminderCheck() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, date, client_name, balance')
    .is('deleted_at', null)
    .neq('invoice_type', 'proforma')
    .gt('balance', 0);

  if (error) {
    console.error('[balance-reminder] failed to load invoices:', error);
    return { sent: false, error: error.message };
  }
  if (!data || data.length === 0) return { sent: false, skipped: 'no outstanding invoices' };

  const cutoff = Date.now() - MIN_DAYS_OVERDUE * 24 * 60 * 60 * 1000;
  const overdue = data.filter((inv) => new Date(ddmmyyyyToIso(inv.date)).getTime() <= cutoff);
  if (overdue.length === 0) return { sent: false, skipped: 'nothing past the 14-day threshold yet' };

  const newlyOverdue: typeof overdue = [];
  for (const inv of overdue) {
    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('template', TEMPLATE)
      .eq('invoice_id', inv.id);
    if ((count ?? 0) === 0) newlyOverdue.push(inv);
  }

  if (newlyOverdue.length === 0) return { sent: false, skipped: 'already reminded about every currently-overdue invoice' };

  const total = newlyOverdue.reduce((s, inv) => s + Number(inv.balance), 0);
  const subject = `${newlyOverdue.length} invoice${newlyOverdue.length > 1 ? 's' : ''} with an overdue balance`;
  const rows = newlyOverdue
    .map((inv) => `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:13px;">${inv.invoice_no}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:13px;">${inv.client_name}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">₹${fmt(Number(inv.balance))}</td>
    </tr>`)
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;">
    <p style="font-size:14px;line-height:1.8;">${newlyOverdue.length} invoice${newlyOverdue.length > 1 ? 's have' : ' has'} an unpaid balance more than ${MIN_DAYS_OVERDUE} days old, might be worth a follow-up with the client:</p>
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <thead><tr style="background:#f8f8f8;">
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;">Invoice</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;">Client</th>
        <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;">Balance</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:13px;color:#888;">Total overdue: ₹${fmt(total)}</p>
  </div>`;

  await sendAdminAlert(subject, html);

  for (const inv of newlyOverdue) {
    await supabase.from('email_logs').insert({
      to_email: 'yaftdesigns@gmail.com',
      to_name: 'Yokes',
      subject,
      template: TEMPLATE,
      status: 'sent',
      invoice_id: inv.id,
    });
  }

  return { sent: true, count: newlyOverdue.length, total };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const isManualCall = cronSecret.length > 0 && authHeader === ('Bearer ' + cronSecret);
  if (!isVercelCron && !isManualCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runBalanceReminderCheck();
  return NextResponse.json(result);
}

export async function POST() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runBalanceReminderCheck();
  return NextResponse.json(result);
}
