import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { sendEmail, isEmailConfigured, getNotificationBcc } from '@/lib/email';
import { buildInvoicesWorkbook, ddmmyyyyToIso, type InvoiceRow } from '@/lib/invoicesExport';
import { monthKey, monthLabel } from '@/lib/jobsGrouping';
import { getErrorMessage } from '@/lib/errorMessage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/admin/invoices/email-monthly
// { month: 'YYYY-MM', recipientEmail, recipientName? }
// Filters invoices to that one month, builds a single-sheet .xlsx (same
// builder as the full export, just handed a pre-filtered array), and
// emails it with a short summary in the body. Logged to email_logs
// the same way every other outbound email on the site is.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  const month = String(data?.month ?? '').trim();
  const recipientEmail = String(data?.recipientEmail ?? '').trim().toLowerCase();
  const recipientName = String(data?.recipientName ?? '').trim() || 'there';

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 });
  }
  if (!EMAIL_RE.test(recipientEmail)) {
    return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: allInvoices, error } = await supabase
    .from('invoices')
    .select('invoice_no, date, client_name, client_gst, client_state, invoice_type, items, total, advance, balance')
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const monthInvoices = ((allInvoices ?? []) as InvoiceRow[]).filter(
    (inv) => monthKey(ddmmyyyyToIso(inv.date)) === month
  );

  if (monthInvoices.length === 0) {
    return NextResponse.json({ error: `No invoices found for ${monthLabel(month)}` }, { status: 404 });
  }

  const buffer = await buildInvoicesWorkbook(monthInvoices);
  const grandTotal = monthInvoices.reduce((s, i) => s + Number(i.total), 0);
  const label = monthLabel(month);

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'Email is not configured on the server' }, { status: 503 });
  }

  const subject = `YAFT Designs — Invoices for ${label}`;

  const invoiceRows = monthInvoices
    .slice()
    .sort((a, b) => ddmmyyyyToIso(a.date).localeCompare(ddmmyyyyToIso(b.date)))
    .map((inv) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;">${inv.invoice_no}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;">${inv.date}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;">${inv.client_name}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>`)
    .join('');

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 12px;">Hi ${recipientName},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">Attached are all ${monthInvoices.length} invoice${monthInvoices.length > 1 ? 's' : ''} for <strong>${label}</strong>, with the GST breakdown for each in the sheet. Summary below, total billed for the month: <strong>INR ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
    <thead>
      <tr style="background:#f8f8f8;">
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#888;">Invoice No</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#888;">Date</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#888;">Client</th>
        <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#888;">Total (INR)</th>
      </tr>
    </thead>
    <tbody>${invoiceRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding:8px 10px;font-size:13px;font-weight:600;">Total</td>
        <td style="padding:8px 10px;font-size:13px;font-weight:600;text-align:right;">${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">YAFT Designs &middot; Coimbatore, India</p>
</div>`;

  let status = 'sent';
  let errMsg: string | null = null;

  try {
    await sendEmail({
      to: recipientEmail,
      subject,
      html,
      bcc: getNotificationBcc(),
      attachments: [{
        filename: `YAFT_Invoices_${month}.xlsx`,
        content: buffer.toString('base64'),
      }],
    });
  } catch (mailErr) {
    status = 'failed';
    errMsg = getErrorMessage(mailErr);
    console.error('[invoices/email-monthly] send failed:', mailErr);
  }

  try {
    await supabase.from('email_logs').insert({
      to_email: recipientEmail,
      to_name: recipientName,
      subject,
      template: 'monthly_invoices_export',
      status,
      error: errMsg,
    });
  } catch (logErr) {
    console.error('[invoices/email-monthly] email_logs insert failed:', logErr);
  }

  if (status === 'failed') {
    return NextResponse.json({ error: errMsg ?? 'Failed to send email' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: monthInvoices.length, total: grandTotal });
}
