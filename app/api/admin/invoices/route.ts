import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { computeInvoiceTotals } from '@/lib/invoiceMath';

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
