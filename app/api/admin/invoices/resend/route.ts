import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { generatePDF } from '@/lib/invoicePdf';

const YAFT_EMAIL = 'yaftdesigns@gmail.com';

async function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

// POST /api/admin/invoices/resend  { id }
// Regenerates the PDF from the invoice's current (possibly just-edited)
// database row and re-emails it to the client. Used after editing an
// already-sent invoice, so the client gets the corrected version.
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: inv, error: fetchErr } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (fetchErr || !inv) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const pdfData = {
    invoice_no:     inv.invoice_no,
    date:           inv.date,
    client_name:    inv.client_name,
    client_email:   inv.client_email,
    client_type:    inv.client_type,
    client_company: inv.client_company,
    client_pan:     inv.client_pan,
    client_gst:     inv.client_gst,
    client_state:   inv.client_state,
    client_address: inv.client_address,
    client_phone:   inv.client_phone,
    items:          inv.items,
    advance:        inv.advance,
    balance:        inv.balance,
    invoice_type:   inv.invoice_type || 'training',
  };

  try {
    const pdfBuffer = await generatePDF(pdfData);
    const pdfBase64 = pdfBuffer.toString('base64');

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      return NextResponse.json({ error: 'Email is not configured' }, { status: 500 });
    }

    const gmail = await getGmailClient();
    const boundary = 'yaft_invoice_resend_boundary';
    const isProformaEmail = inv.invoice_type === 'proforma';
    const subject = isProformaEmail
      ? `Revised Proforma Invoice ${inv.invoice_no} - YAFT Designs`
      : `Revised Invoice ${inv.invoice_no} - YAFT Designs Training`;
    const fmt = (n: number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 12px;">Hi ${inv.client_name},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">Please find attached a revised copy of your ${isProformaEmail ? 'proforma invoice' : 'invoice'} from YAFT Designs, replacing the version sent earlier.</p>
  <table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:24px;">
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Invoice No</td><td style="padding:8px 12px;font-weight:600;">${inv.invoice_no}</td></tr>
    <tr><td style="padding:8px 12px;color:#888;">Date</td><td style="padding:8px 12px;">${inv.date}</td></tr>
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Total Amount</td><td style="padding:8px 12px;font-weight:600;">INR ${fmt(inv.total)}</td></tr>
    ${inv.advance > 0 ? `<tr><td style="padding:8px 12px;color:#888;">Advance Paid</td><td style="padding:8px 12px;">INR ${fmt(inv.advance)}</td></tr>` : ''}
    ${inv.balance > 0 ? `<tr style="background:#fff3f3;"><td style="padding:8px 12px;color:#888;">Balance Due</td><td style="padding:8px 12px;font-weight:600;color:#E63946;">INR ${fmt(inv.balance)}</td></tr>` : ''}
  </table>
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">YAFT Designs · Authorized Rhino Training Center · Coimbatore, India<br><a href="https://www.yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a></p>
</div>`;

    const raw = [
      `From: YAFT Designs <${YAFT_EMAIL}>`,
      `To: ${inv.client_name} <${inv.client_email}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      htmlBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${isProformaEmail ? 'YAFT_Proforma' : 'YAFT_Invoice'}_${inv.invoice_no}_revised.pdf"`,
      ``,
      pdfBase64,
      `--${boundary}--`,
    ].join('\n');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: Buffer.from(raw).toString('base64url') },
    });

    try {
      await supabase.from('email_logs').insert({
        to_email: inv.client_email,
        to_name:  inv.client_name,
        subject,
        template: isProformaEmail ? 'proforma_invoice_revision' : 'invoice_revision',
        status:   'sent',
        error:    null,
      });
    } catch (logErr) {
      console.error('[invoice-resend] email_logs insert failed:', logErr);
    }

    return NextResponse.json({ ok: true, pdf: pdfBase64 });
  } catch (err) {
    console.error('[invoice-resend] failed:', err);
    return NextResponse.json({ error: 'Failed to resend invoice' }, { status: 500 });
  }
}
