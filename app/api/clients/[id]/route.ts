import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    update.name = name;
  }
  if (data.company_name !== undefined) update.company_name = data.company_name || null;
  if (data.gstin !== undefined) update.gstin = data.gstin || null;
  if (data.address !== undefined) update.address = data.address || null;
  if (data.phone !== undefined) update.phone = data.phone || null;
  if (data.email !== undefined) update.email = data.email || null;
  if (data.notes !== undefined) update.notes = data.notes || null;
  if (data.active !== undefined) update.active = !!data.active;
  update.updated_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { data: clientRow, error } = await supabase.from('clients').update(update).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: clientRow });
}

// DELETE /api/clients/[id] — soft delete only. A client with job/invoice
// history shouldn't disappear from those records, so this never hard-
// deletes; it just sets deleted_at and stops it showing in the picker.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('clients').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
