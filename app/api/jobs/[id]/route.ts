import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { computeTaxFromMode, type InvoiceTaxMode } from '@/lib/invoiceMath';

const GST_TYPE_TO_TAX_MODE: Record<string, InvoiceTaxMode> = {
  intra: 'intra',
  inter: 'interstate',
  none: 'intl',
};

const JOB_TYPES = ['2D Drawing', '3D STL', 'Computational', 'Monthly Retainer'];
const GST_TYPES = ['intra', 'inter', 'none'];
const STATUSES = ['Pending', 'Invoiced', 'Paid'];

// PATCH /api/jobs/[id]
// Body can be a partial update (e.g. { status: 'Paid' } from a quick-action
// button) or a full edit. Whenever qty/rate/gst_type change, tax fields are
// recomputed server-side rather than trusting whatever the client sends --
// same reasoning as computeInvoiceTotals being the single source of truth.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await supabase.from('jobs').select('*').eq('id', id).single();
  if (fetchErr || !existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const update: Record<string, unknown> = {};

  if (data.job_no !== undefined) update.job_no = data.job_no ? String(data.job_no).trim() : null;
  if (data.client_name !== undefined) {
    const client_name = String(data.client_name).trim();
    if (!client_name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    update.client_name = client_name;
  }
  if (data.client_id !== undefined) update.client_id = data.client_id || null;
  if (data.job_type !== undefined) {
    if (!JOB_TYPES.includes(data.job_type)) return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    update.job_type = data.job_type;
  }
  if (data.job_date !== undefined) update.job_date = data.job_date;
  if (data.notes !== undefined) update.notes = data.notes || null;
  if (data.status !== undefined) {
    if (!STATUSES.includes(data.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    update.status = data.status;
  }

  const qtyChanged = data.qty !== undefined;
  const rateChanged = data.rate !== undefined;
  const gstChanged = data.gst_type !== undefined;

  if (gstChanged && !GST_TYPES.includes(data.gst_type)) {
    return NextResponse.json({ error: 'Invalid GST type' }, { status: 400 });
  }

  if (qtyChanged || rateChanged || gstChanged) {
    const qty = qtyChanged ? Number(data.qty) : Number(existing.qty);
    const rate = rateChanged ? Number(data.rate) : Number(existing.rate);
    const gst_type = gstChanged ? data.gst_type : existing.gst_type;
    if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    if (!Number.isFinite(rate) || rate < 0) return NextResponse.json({ error: 'Rate must be a non-negative number' }, { status: 400 });

    const subtotal = qty * rate;
    const { cgst, sgst, igst, total } = computeTaxFromMode(subtotal, GST_TYPE_TO_TAX_MODE[gst_type]);
    Object.assign(update, { qty, rate, gst_type, cgst, sgst, igst, total });
  }

  const { data: job, error } = await supabase.from('jobs').update(update).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job });
}

// DELETE /api/jobs/[id]
// Soft delete (sets deleted_at) by default so an accidental delete can be
// undone from a Trash tab -- same pattern as invoices. Pass ?permanent=1
// to actually remove the row (used from the Trash tab itself).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const permanent = request.nextUrl.searchParams.get('permanent') === '1';
  const supabase = getSupabaseAdmin();

  if (permanent) {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from('jobs').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PUT /api/jobs/[id]?restore=1 — undo a soft delete from the Trash tab.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('jobs').update({ deleted_at: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
