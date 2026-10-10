import { NextRequest, NextResponse } from 'next/server';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET /api/admin/testimonials?status=pending
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const supabase = getSupabaseAdmin();
  let query = supabase.from('testimonials').select('*');
  if (status) query = query.eq('status', status);
  query = query.order('submitted_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[testimonials-api] GET failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// PATCH /api/admin/testimonials  { id, status }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('testimonials')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[testimonials-api] PATCH failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/testimonials  { id }
export async function DELETE(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = body?.id;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('testimonials').delete().eq('id', id);

  if (error) {
    console.error('[testimonials-api] DELETE failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
