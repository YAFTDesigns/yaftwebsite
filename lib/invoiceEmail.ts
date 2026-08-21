import { generatePDF, type InvoicePdfData } from './invoicePdf';
import { computeInvoiceTotals } from './invoiceMath';
import { sendEmail, isEmailConfigured, getNotificationBcc } from './email';
import { getSupabaseAdmin } from './supabase/admin';
import { getErrorMessage } from './errorMessage';

export type InvoiceForEmail = InvoicePdfData & {
  grand_total: number;
  schedule_note?: string | null;
};

export type SendInvoiceEmailResult = {
  status: 'sent' | 'failed' | 'skipped';
  errMsg: string | null;
  pdfBase64: string;
};

// The full invoice email (PDF generation + HTML body + send + log),
// extracted into one shared function so the immediate-send path
// (POST /api/invoices) and the scheduled-send cron can't drift into
// two different emails for the same kind of invoice. Whichever caller
// invokes this, the client gets the identical email.
export async function sendInvoiceEmail(data: InvoiceForEmail): Promise<SendInvoiceEmailResult> {
  const pdfBuffer = await generatePDF(data);
  const pdfBase64 = pdfBuffer.toString('base64');

  if (!isEmailConfigured()) {
    return { status: 'skipped', errMsg: null, pdfBase64 };
  }

  const isProformaEmail = data.invoice_type === 'proforma';
  const subject = isProformaEmail
    ? `Proforma Invoice ${data.invoice_no} - YAFT Designs`
    : `Invoice ${data.invoice_no} - YAFT Designs Training`;
  const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const advance = data.advance || 0;
  const balance = data.balance || 0;

  // Same computeInvoiceTotals() the PDF and Excel export already use,
  // recomputed from items+client_state rather than trusting a
  // client-sent grand_total as an opaque number -- single source of
  // truth for the tax breakdown.
  const taxTotals = computeInvoiceTotals(data.items ?? [], data.client_state ?? '');

  const itemRows = (data.items ?? [])
    .map((item) => `
    <tr>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;">${item.desc || '—'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.rate)}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.qty * item.rate)}</td>
    </tr>`).join('');

  const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 12px;">Hi ${data.client_name},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">${isProformaEmail ? 'Please find attached your proforma invoice from YAFT Designs. This is for your reference and is not a tax document.' : 'Please find attached your invoice for YAFT Designs training. Thank you for training with us.'}</p>
  <table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:16px;">
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Invoice No</td><td style="padding:8px 12px;font-weight:600;">${data.invoice_no}</td></tr>
    <tr><td style="padding:8px 12px;color:#888;">Date</td><td style="padding:8px 12px;">${data.date}</td></tr>
  </table>
  ${itemRows ? `<table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:16px;">
    <thead>
      <tr style="background:#f8f8f8;"><th style="padding:7px 12px;text-align:left;color:#888;font-weight:600;">Description</th><th style="padding:7px 12px;text-align:center;color:#888;font-weight:600;">Qty</th><th style="padding:7px 12px;text-align:right;color:#888;font-weight:600;">Rate (INR)</th><th style="padding:7px 12px;text-align:right;color:#888;font-weight:600;">Amount (INR)</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>` : ''}
  <table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:24px;">
    <tr><td style="padding:8px 12px;color:#888;">Subtotal</td><td style="padding:8px 12px;">INR ${fmt(taxTotals.subtotal)}</td></tr>
    ${taxTotals.cgst > 0 ? `<tr><td style="padding:8px 12px;color:#888;">CGST 9%</td><td style="padding:8px 12px;">INR ${fmt(taxTotals.cgst)}</td></tr>` : ''}
    ${taxTotals.sgst > 0 ? `<tr><td style="padding:8px 12px;color:#888;">SGST 9%</td><td style="padding:8px 12px;">INR ${fmt(taxTotals.sgst)}</td></tr>` : ''}
    ${taxTotals.igst > 0 ? `<tr><td style="padding:8px 12px;color:#888;">IGST 18%</td><td style="padding:8px 12px;">INR ${fmt(taxTotals.igst)}</td></tr>` : ''}
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Total Amount</td><td style="padding:8px 12px;font-weight:600;">INR ${fmt(data.grand_total)}</td></tr>
    ${advance > 0 ? `<tr><td style="padding:8px 12px;color:#888;">Advance Paid</td><td style="padding:8px 12px;">INR ${fmt(advance)}</td></tr>` : ''}
    ${balance > 0 ? `<tr style="background:#fff3f3;"><td style="padding:8px 12px;color:#888;">Balance Due</td><td style="padding:8px 12px;font-weight:600;color:#E63946;">INR ${fmt(balance)}</td></tr>` : ''}
  </table>
  ${isProformaEmail && data.schedule_note ? `<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:16px;">
    <p style="font-size:12px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 8px;">Schedule</p>
    <p style="font-size:13px;color:#333;line-height:1.7;margin:0 0 10px;white-space:pre-line;">${data.schedule_note}</p>
    <p style="font-size:12px;color:#777;line-height:1.6;margin:0;">${data.client_type === 'company' ? 'Sessions may be screen-recorded by all attendees for internal reference.' : 'Sessions may be screen-recorded by the participant for personal reference only.'}</p>
  </div>` : ''}
  ${isProformaEmail ? `<div style="background:#1a0808;border:1px solid #E63946;border-radius:8px;padding:16px;margin-bottom:16px;">
    <p style="font-size:13px;font-weight:600;color:#E63946;margin:0 0 6px;">To book your slot</p>
    <p style="font-size:13px;color:#ddd;line-height:1.7;margin:0;">Pay 50% advance to confirm. Dates and schedule are finalized only after the advance is received.</p>
  </div>` : ''}
  ${isProformaEmail ? `<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="font-size:12px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 8px;">Billing details needed</p>
    <p style="font-size:13px;color:#333;line-height:1.7;margin:0 0 8px;">To issue the final invoice, please share the following:</p>
    <ul style="font-size:13px;color:#333;line-height:1.9;margin:0;padding-left:20px;">
      <li>GST Number (or PAN, if not GST registered)</li>
      <li>Billing address</li>
      <li>Mobile number</li>
      <li>Email ID for billing</li>
    </ul>
  </div>` : ''}
  <img src="https://www.yaftdesigns.com/assets/images/rhino-banner.png" alt="Rhinoceros, design, model, present, analyze, realize" style="width:100%;display:block;margin:0 0 24px;" />
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;">
  <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px;">Share your experience</p>
  <p style="font-size:13px;color:#555;line-height:1.7;margin:0 0 12px;">If the training has been useful, we'd love a quick testimonial. It helps other students and professionals find us.</p>
  <a href="https://www.yaftdesigns.com/#contact" style="display:inline-block;background:#E63946;color:#fff;font-size:12px;padding:9px 18px;border-radius:6px;text-decoration:none;margin-bottom:20px;">Leave a testimonial &rarr;</a>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;">
  <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px;">Feature your work on yaftdesigns.com</p>
  <p style="font-size:13px;color:#555;line-height:1.7;margin:0 0 12px;">Once your project is done, submit it to our <strong>YAFT Community Works</strong> wall, a public portfolio space where students and collaborators showcase what they've built. Your card includes your project, tools used, and a link to your portfolio or LinkedIn.</p>
  <a href="https://www.yaftdesigns.com/projects/community" style="display:inline-block;border:1px solid #E63946;color:#E63946;font-size:12px;padding:9px 18px;border-radius:6px;text-decoration:none;margin-bottom:24px;">Submit your project &rarr;</a>
  <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;">
  <p style="font-size:12px;color:#888;margin:0;line-height:1.7;">YAFT Designs &middot; Authorized Rhino Training Center &middot; Coimbatore, India<br><a href="https://www.yaftdesigns.com" style="color:#E63946;text-decoration:none;">yaftdesigns.com</a></p>
</div>`;

  let status: 'sent' | 'failed' = 'sent';
  let errMsg: string | null = null;
  try {
    await sendEmail({
      to: `${data.client_name} <${data.client_email}>`,
      subject,
      html: htmlBody,
      bcc: getNotificationBcc(),
      attachments: [{
        filename: `${isProformaEmail ? 'YAFT_Proforma' : 'YAFT_Invoice'}_${data.invoice_no}.pdf`,
        content: pdfBase64,
      }],
    });
  } catch (mailErr) {
    status = 'failed';
    errMsg = getErrorMessage(mailErr);
    console.error('Invoice email send failed:', mailErr);
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('email_logs').insert({
      to_email: data.client_email,
      to_name: data.client_name,
      subject,
      template: isProformaEmail ? 'proforma_invoice' : 'invoice',
      status,
      error: errMsg,
    });
  } catch (logErr) {
    console.error('[invoice] email_logs insert failed:', logErr);
  }

  return { status, errMsg, pdfBase64 };
}
