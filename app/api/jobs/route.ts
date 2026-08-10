import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { computeTaxFromMode, type InvoiceTaxMode } from '@/lib/invoiceMath';
import { attachStatusDates } from '@/lib/jobStatusDates';

// jobs.gst_type is stored as 'intra' | 'inter' | 'none' (DB check constraint),
// which doesn't line up 1:1 with InvoiceTaxMode's 'intra' | 'interstate' |
// 'intl' naming, so map between them rather than renaming one to match the
// other -- the DB values were already live data from the standalone app.
const GST_TYPE_TO_TAX_MODE: Record<string, InvoiceTaxMode> = {
  intra: 'intra',
  inter: 'interstate',
  none: 'intl',
};

const JOB_TYPES = ['2D Drawing', '3D STL', 'Computational', 'Monthly Retainer'];
const GST_TYPES = ['intra', 'inter', 'none'];

export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeDeleted = request.nextUrl.searchParams.get('trash') === '1';
  const clientId = request.nextUrl.searchParams.get('client_id');
  const supabase = getSupabaseAdmin();
  let query = supabase.from('jobs').select('*').order('job_date', { ascending: false });
  query = includeDeleted ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
  if (clientId) query = query.eq('client_id', clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const jobs = await attachStatusDates(supabase, data ?? []);
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const client_name = String(data.client_name ?? '').trim();
  const job_type = String(data.job_type ?? '');
  const gst_type = String(data.gst_type ?? 'intra');
  const qty = Number(data.qty);
  const rate = Number(data.rate);

  if (!client_name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
  if (!JOB_TYPES.includes(job_type)) return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
  if (!GST_TYPES.includes(gst_type)) return NextResponse.json({ error: 'Invalid GST type' }, { status: 400 });
  if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
  if (!Number.isFinite(rate) || rate < 0) return NextResponse.json({ error: 'Rate must be a non-negative number' }, { status: 400 });

  const subtotal = qty * rate;
  const taxMode = GST_TYPE_TO_TAX_MODE[gst_type];
  const { cgst, sgst, igst, total } = computeTaxFromMode(subtotal, taxMode);

  const supabase = getSupabaseAdmin();
  const { data: job, error } = await supabase.from('jobs').insert({
    job_no: data.job_no ? String(data.job_no).trim() : null,
    client_id: data.client_id || null,
    client_name,
    job_type,
    job_date: data.job_date || new Date().toISOString().slice(0, 10),
    qty,
    rate,
    gst_type,
    cgst,
    sgst,
    igst,
    total,
    status: 'Pending',
    notes: data.notes || null,
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('job_status_events').insert({ job_id: job.id, status: 'Pending' });

  return NextResponse.json({ job });
}
