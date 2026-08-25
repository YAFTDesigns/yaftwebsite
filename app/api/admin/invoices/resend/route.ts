import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { generatePDF } from '@/lib/invoicePdf';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { sendEmail, isEmailConfigured, getNotificationBcc } from '@/lib/email';
import { sendInvoiceEmail, type InvoiceForEmail } from '@/lib/invoiceEmail';

// POST /api/admin/invoices/resend  { id }
// Regenerates the PDF from the invoice's current (possibly just-edited)
// database row and emails it to the client.
//
// Branches on whether this invoice has ever actually been sent
// (email_sent_at). A converted-but-not-yet-sent invoice (see
// convert_to_invoice in ../route.ts, which deliberately saves without
// sending) needs a genuine first send -- "Invoice X" wording via the
// same shared sendInvoiceEmail() every other first send uses, not
// "Revised Invoice X, replacing the version sent earlier" below, which
// would be actively wrong for something that was never sent before.
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

  if (!inv.email_sent_at) {
    try {
      const result = await sendInvoiceEmail({
        invoice_no: inv.invoice_no,
        date: inv.date,
        client_name: inv.client_name,
        client_email: inv.client_email,
        client_type: inv.client_type,
        client_company: inv.client_company,
        client_pan: inv.client_pan,
        client_gst: inv.client_gst,
        client_state: inv.client_state,
        client_address: inv.client_address,
        client_phone: inv.client_phone,
        items: inv.items,
        advance: inv.advance,
        balance: inv.balance,
        grand_total: inv.total,
        invoice_type: inv.invoice_type || 'training',
        schedule_note: inv.schedule_note,
      } as InvoiceForEmail);

      await supabase.from('invoices').update({ email_sent_at: new Date().toISOString(), status: 'sent' }).eq('id', id);
      await logInvoiceEvent({
        invoiceId: id, invoiceNo: inv.invoice_no, event: 'created',
        message: `First send: PDF generated and emailed to ${inv.client_email}`,
      });
      return NextResponse.json({ ok: true, pdf: result.pdfBase64 });
    } catch (err) {
      console.error('[invoice-resend] first send failed:', err);
      return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 });
    }
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

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'Email is not configured' }, { status: 500 });
    }

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

    await sendEmail({
      to: `${inv.client_name} <${inv.client_email}>`,
      subject,
      html: htmlBody,
      bcc: getNotificationBcc(),
      attachments: [{
        filename: `${isProformaEmail ? 'YAFT_Proforma' : 'YAFT_Invoice'}_${inv.invoice_no}_revised.pdf`,
        content: pdfBase64,
      }],
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

    await logInvoiceEvent({
      invoiceId: inv.id, invoiceNo: inv.invoice_no, event: 'resent',
      message: `PDF regenerated and resent to ${inv.client_email}`,
    });

    return NextResponse.json({ ok: true, pdf: pdfBase64 });
  } catch (err) {
    console.error('[invoice-resend] failed:', err);
    return NextResponse.json({ error: 'Failed to resend invoice' }, { status: 500 });
  }
}
