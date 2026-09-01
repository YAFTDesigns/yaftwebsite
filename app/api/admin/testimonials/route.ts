import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET /api/admin/testimonials?status=pending&trash=true
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const trash = searchParams.get('trash') === 'true';

  const supabase = getSupabaseAdmin();
  let query = supabase.from('testimonials').select('*');
  query = trash ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);
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
// Soft delete -- sets deleted_at rather than removing the row, so it
// stays recoverable via the Trash view (PUT below restores it).
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('testimonials').update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) {
    console.error('[testimonials-api] DELETE failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PUT /api/admin/testimonials  { id }
// Restores a soft-deleted testimonial -- clears deleted_at.
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('testimonials').update({ deleted_at: null }).eq('id', id);

  if (error) {
    console.error('[testimonials-api] PUT (restore) failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
