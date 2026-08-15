import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { pushInvoiceToQueue } from '@/lib/queue';
import { generatePDF } from '@/lib/invoicePdf';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { sendEmail, isEmailConfigured, getNotificationBcc } from '@/lib/email';
import { getErrorMessage } from '@/lib/errorMessage';

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  try {
    const pdfBuffer = await generatePDF(data);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Save to Supabase
    const supabase = getSupabaseAdmin();
    const { data: inv, error } = await supabase.from('invoices').insert({
      invoice_no:     data.invoice_no,
      date:           data.date,
      client_name:    data.client_name,
      client_email:   data.client_email,
      client_type:    data.client_type,
      client_company: data.client_company || null,
      client_pan:     data.client_pan || null,
      client_gst:     data.client_gst || null,
      client_state:   data.client_state,
      client_address: data.client_address || null,
      client_phone:   data.client_phone || null,
      items:          data.items,
      total:          data.grand_total,
      advance:        data.advance || 0,
      balance:        data.balance || 0,
      invoice_type:   data.invoice_type || 'training',
      status:         'sent',
    }).select('id').single();

    if (!error && inv) {
      await logInvoiceEvent({
        invoiceId: inv.id,
        invoiceNo: data.invoice_no,
        event: 'created',
        message: `Created for ${data.client_name}, INR ${Number(data.grand_total).toLocaleString('en-IN')}`,
      });
    }

    if (error) {
      console.error('Invoice save error, queueing for retry:', error);
      // Queue for retry when Supabase recovers, continue to send email
      try {
        await pushInvoiceToQueue({
          invoice_no:   data.invoice_no,
          date:         data.date,
          client_name:  data.client_name,
          client_email: data.client_email,
          client_type:  data.client_type,
          client_company: data.client_company || null,
          client_pan:   data.client_pan || null,
          client_gst:   data.client_gst || null,
          client_state: data.client_state,
          client_address: data.client_address || null,
          client_phone:   data.client_phone || null,
          items:        data.items,
          total:        data.grand_total,
          advance:      data.advance || 0,
          balance:      data.balance || 0,
          invoice_type: data.invoice_type || 'training',
          queuedAt:     new Date().toISOString(),
        });
      } catch (qErr) {
        console.error('Invoice queue also failed:', qErr);
      }
      await logInvoiceEvent({
        invoiceNo: data.invoice_no,
        event: 'queued',
        message: `Save failed, queued for retry, ${error.message}`,
        meta: { error: error.message },
      });
      // Don't return error, continue to send email below
    }

    // Send via Resend with PDF attachment
    if (isEmailConfigured()) {
      const isProformaEmail = data.invoice_type === 'proforma';
      const subject  = isProformaEmail
        ? `Proforma Invoice ${data.invoice_no} - YAFT Designs`
        : `Invoice ${data.invoice_no} - YAFT Designs Training`;
      const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const advance = data.advance || 0;
      const balance = data.balance || 0;

      const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <p style="font-size:14px;line-height:1.8;margin:0 0 12px;">Hi ${data.client_name},</p>
  <p style="font-size:14px;line-height:1.8;margin:0 0 20px;">${isProformaEmail ? 'Please find attached your proforma invoice from YAFT Designs. This is for your reference and is not a tax document.' : 'Please find attached your invoice for YAFT Designs training. Thank you for training with us.'}</p>
  <table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:24px;">
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Invoice No</td><td style="padding:8px 12px;font-weight:600;">${data.invoice_no}</td></tr>
    <tr><td style="padding:8px 12px;color:#888;">Date</td><td style="padding:8px 12px;">${data.date}</td></tr>
    <tr style="background:#f8f8f8;"><td style="padding:8px 12px;color:#888;">Total Amount</td><td style="padding:8px 12px;font-weight:600;">INR ${fmt(data.grand_total)}</td></tr>
    ${advance > 0 ? `<tr><td style="padding:8px 12px;color:#888;">Advance Paid</td><td style="padding:8px 12px;">INR ${fmt(advance)}</td></tr>` : ''}
    ${balance > 0 ? `<tr style="background:#fff3f3;"><td style="padding:8px 12px;color:#888;">Balance Due</td><td style="padding:8px 12px;font-weight:600;color:#E63946;">INR ${fmt(balance)}</td></tr>` : ''}
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

      let status = 'sent';
      let errMsg = null;
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
        await supabase.from('email_logs').insert({
          to_email: data.client_email,
          to_name:  data.client_name,
          subject,
          template: isProformaEmail ? 'proforma_invoice' : 'invoice',
          status,
          error: errMsg,
        });
      } catch (logErr) {
        console.error('[invoice] email_logs insert failed:', logErr);
      }
    }

    return NextResponse.json({ ok: true, pdf: pdfBase64, invoiceId: inv?.id ?? null });
  } catch (err) {
    console.error('Invoice error:', err);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

// DELETE /api/invoices  { id }
// Permanently removes an invoice row. Intended only for invoices that
// are already in Trash (deleted_at set) — the client-side confirm()
// dialog warns this is unrecoverable. Uses the service-role key via
// getSupabaseAdmin() so it works correctly regardless of what RLS
// delete policy (if any) exists for the anon key, the same fix
// pattern applied to Community, Emails, and Testimonials moderation.
export async function DELETE(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('invoices').delete().eq('id', id);

  if (error) {
    console.error('[invoices-api] permanent delete failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
