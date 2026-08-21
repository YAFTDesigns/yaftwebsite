import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { pushInvoiceToQueue } from '@/lib/queue';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { sendInvoiceEmail, type InvoiceForEmail } from '@/lib/invoiceEmail';

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 10, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  // Optional scheduled send: a future timestamp means "create the
  // invoice now, but hold the email until then" -- picked up later by
  // the send-scheduled-invoices cron. Anything in the past or absent
  // just means send immediately, same as before this existed.
  const scheduledSendAt: string | null =
    data.scheduled_send_at && new Date(data.scheduled_send_at).getTime() > Date.now()
      ? new Date(data.scheduled_send_at).toISOString()
      : null;

  try {
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
      schedule_note:  data.schedule_note || null,
      status:         'sent',
      scheduled_send_at: scheduledSendAt,
      email_sent_at:  scheduledSendAt ? null : new Date().toISOString(),
    }).select('id').single();

    if (!error && inv) {
      await logInvoiceEvent({
        invoiceId: inv.id,
        invoiceNo: data.invoice_no,
        event: 'created',
        message: scheduledSendAt
          ? `Created for ${data.client_name}, INR ${Number(data.grand_total).toLocaleString('en-IN')} -- email scheduled for ${new Date(scheduledSendAt).toLocaleString('en-IN')}`
          : `Created for ${data.client_name}, INR ${Number(data.grand_total).toLocaleString('en-IN')}`,
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

    // Scheduled sends skip the email entirely here -- the cron sends
    // it later. Still returns a PDF preview for the admin UI, without
    // logging a send/failure that hasn't actually happened yet.
    if (scheduledSendAt) {
      const { generatePDF } = await import('@/lib/invoicePdf');
      const pdfBuffer = await generatePDF(data as InvoiceForEmail);
      return NextResponse.json({ ok: true, scheduled: true, scheduledSendAt, pdf: pdfBuffer.toString('base64'), invoiceId: inv?.id ?? null });
    }

    const result = await sendInvoiceEmail(data as InvoiceForEmail);
    return NextResponse.json({ ok: true, pdf: result.pdfBase64, invoiceId: inv?.id ?? null });
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
