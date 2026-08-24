import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { computeInvoiceTotals } from '@/lib/invoiceMath';
import { sendInvoiceEmail, type InvoiceForEmail } from '@/lib/invoiceEmail';

// GET /api/admin/invoices?trash=true   — list active or trashed invoices
// GET /api/admin/invoices?log=true     — list invoice event log (newest first)
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const supabase = getSupabaseAdmin();

  if (params.get('log') === 'true') {
    const { data, error } = await supabase
      .from('invoice_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  const trash = params.get('trash') === 'true';

  const { data, error } = trash
    ? await supabase.from('invoices').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
    : await supabase.from('invoices').select('*').is('deleted_at', null).order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// PATCH /api/admin/invoices
// { action: 'cancel_scheduled_send', id }
// { action: 'convert_to_invoice', id, invoice_type? }
// { action: 'update_payment', id, advance }
// { action: 'update_details', id, client_name, client_email, client_type,
//   client_company, client_pan, client_gst, client_state, client_address,
//   client_phone, items, advance }
// { action: 'soft_delete',    id }
// { action: 'bulk_soft_delete', ids }
// { action: 'restore',        id }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  if (body.action === 'cancel_scheduled_send') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { data: inv, error: fetchErr } = await supabase
      .from('invoices').select('invoice_no, scheduled_send_at, email_sent_at').eq('id', id).single();
    if (fetchErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (!inv.scheduled_send_at) return NextResponse.json({ error: 'This invoice was never scheduled' }, { status: 400 });
    if (inv.email_sent_at) return NextResponse.json({ error: 'Already sent — too late to cancel' }, { status: 400 });

    const { error } = await supabase.from('invoices').update({ send_cancelled: true }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logInvoiceEvent({
      invoiceId: id, invoiceNo: inv.invoice_no, event: 'send_cancelled',
      message: `Scheduled send cancelled (was set for ${new Date(inv.scheduled_send_at).toLocaleString('en-IN')})`,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'convert_to_invoice') {
    const { id, invoice_type } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: proforma, error: fetchErr } = await supabase
      .from('invoices').select('*').eq('id', id).single();
    if (fetchErr || !proforma) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (proforma.invoice_type !== 'proforma') {
      return NextResponse.json({ error: 'Only proforma quotes can be converted' }, { status: 400 });
    }
    if (proforma.converted_to_invoice_id) {
      return NextResponse.json({ error: 'Already converted' }, { status: 400 });
    }
    if (!(Number(proforma.advance) > 0)) {
      return NextResponse.json({ error: 'No advance recorded yet -- record the advance first, then convert' }, { status: 400 });
    }

    // Invoice numbers are only ever manually tracked in the create
    // form's UI, never computed server-side -- there's no admin
    // typing a sequence number during an automatic conversion, so
    // this generates its own non-colliding number: highest existing
    // sequence for the current month's real (non-PF) invoices, plus one.
    const now = new Date();
    const mmyyyy = String(now.getMonth() + 1).padStart(2, '0') + now.getFullYear();
    const { data: monthInvoices } = await supabase
      .from('invoices')
      .select('invoice_no')
      .like('invoice_no', `YAFT-${mmyyyy}-%`);
    const usedSeqs = (monthInvoices ?? [])
      .map((r) => parseInt(r.invoice_no.split('-').pop() ?? '0', 10))
      .filter((n) => !Number.isNaN(n));
    const nextSeq = String((usedSeqs.length ? Math.max(...usedSeqs) : 0) + 1).padStart(2, '0');
    const newInvoiceNo = `YAFT-${mmyyyy}-${nextSeq}`;

    const { data: newInvoice, error: insertErr } = await supabase.from('invoices').insert({
      invoice_no: newInvoiceNo,
      date: proforma.date,
      client_name: proforma.client_name,
      client_email: proforma.client_email,
      client_type: proforma.client_type,
      client_company: proforma.client_company,
      client_pan: proforma.client_pan,
      client_gst: proforma.client_gst,
      client_state: proforma.client_state,
      client_address: proforma.client_address,
      client_phone: proforma.client_phone,
      items: proforma.items,
      total: proforma.total,
      advance: proforma.advance,
      balance: proforma.balance,
      invoice_type: invoice_type || 'training',
      status: 'sent',
      email_sent_at: new Date().toISOString(),
    }).select('id').single();

    if (insertErr || !newInvoice) {
      return NextResponse.json({ error: insertErr?.message ?? 'Failed to create invoice' }, { status: 500 });
    }

    const { error: linkErr } = await supabase
      .from('invoices').update({ converted_to_invoice_id: newInvoice.id }).eq('id', id);
    if (linkErr) console.error('[convert_to_invoice] failed to link proforma to new invoice:', linkErr);

    await logInvoiceEvent({
      invoiceId: id, invoiceNo: proforma.invoice_no, event: 'converted',
      message: `Converted to invoice ${newInvoiceNo}`,
    });
    await logInvoiceEvent({
      invoiceId: newInvoice.id, invoiceNo: newInvoiceNo, event: 'created',
      message: `Converted from proforma ${proforma.invoice_no}, INR ${Number(proforma.total).toLocaleString('en-IN')}`,
    });

    // Sent using the NEW invoice number/type, not the proforma's --
    // this is what makes the email say "Invoice" instead of "Proforma"
    // and skip the proforma-only schedule/advance-banner/billing-details
    // blocks, since invoice_type here is the real one, not 'proforma'.
    const result = await sendInvoiceEmail({
      ...(proforma as InvoiceForEmail),
      invoice_no: newInvoiceNo,
      invoice_type: invoice_type || 'training',
    });

    return NextResponse.json({ ok: true, newInvoiceId: newInvoice.id, newInvoiceNo, emailStatus: result.status });
  }

  if (body.action === 'update_payment') {
    const { id, advance } = body;
    if (!id || typeof advance !== 'number') {
      return NextResponse.json({ error: 'Missing id or advance' }, { status: 400 });
    }
    const { data: inv, error: fetchErr } = await supabase
      .from('invoices').select('total, invoice_no').eq('id', id).single();
    if (fetchErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const balance = inv.total - advance;
    const { error } = await supabase.from('invoices').update({ advance, balance }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logInvoiceEvent({
      invoiceId: id, invoiceNo: inv.invoice_no, event: 'payment_updated',
      message: `Advance updated to ₹${Number(advance).toLocaleString('en-IN')} — balance now ₹${Number(balance).toLocaleString('en-IN')}`,
    });
    return NextResponse.json({ ok: true, balance });
  }

  if (body.action === 'update_details') {
    const { id, items, client_state, advance } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }
    if (!client_state) return NextResponse.json({ error: 'Missing client_state' }, { status: 400 });

    const { total } = computeInvoiceTotals(items, client_state);
    const advanceNum = typeof advance === 'number' ? advance : 0;
    const balance = total - advanceNum;

    const { data: updated, error } = await supabase.from('invoices').update({
      client_name:    body.client_name,
      client_email:   body.client_email,
      client_type:    body.client_type,
      client_company: body.client_company || null,
      client_pan:     body.client_pan || null,
      client_gst:     body.client_gst || null,
      client_state,
      client_address: body.client_address || null,
      client_phone:   body.client_phone || null,
      items,
      total,
      advance: advanceNum,
      balance,
    }).eq('id', id).select('*').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logInvoiceEvent({
      invoiceId: id, invoiceNo: updated.invoice_no, event: 'edited',
      message: `Details updated — total now ₹${Number(total).toLocaleString('en-IN')}`,
    });
    return NextResponse.json({ ok: true, invoice: updated });
  }

  if (body.action === 'soft_delete') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { data: updated, error } = await supabase
      .from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('invoice_no').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logInvoiceEvent({ invoiceId: id, invoiceNo: updated.invoice_no, event: 'deleted', message: 'Moved to trash' });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'bulk_soft_delete') {
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids array' }, { status: 400 });
    }
    const { data: updated, error } = await supabase
      .from('invoices').update({ deleted_at: new Date().toISOString() }).in('id', ids).select('id, invoice_no');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of updated ?? []) {
      await logInvoiceEvent({ invoiceId: row.id, invoiceNo: row.invoice_no, event: 'deleted', message: 'Moved to trash (bulk)' });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'restore') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { data: updated, error } = await supabase.from('invoices').update({ deleted_at: null }).eq('id', id).select('invoice_no').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logInvoiceEvent({ invoiceId: id, invoiceNo: updated.invoice_no, event: 'restored', message: 'Restored from trash' });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
