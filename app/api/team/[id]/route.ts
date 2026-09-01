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
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    update.name = name;
  }
  if (data.role !== undefined) update.role = data.role || null;
  if (data.email !== undefined) update.email = data.email || null;
  if (data.phone !== undefined) update.phone = data.phone || null;
  if (data.salary !== undefined) update.salary = data.salary === '' || data.salary == null ? null : Number(data.salary);
  if (data.notes !== undefined) update.notes = data.notes || null;
  if (data.active !== undefined) update.active = !!data.active;
  update.updated_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { data: member, error } = await supabase.from('team_members').update(update).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('team_members').update({ deleted_at: new Date().toISOString(), active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PUT /api/team/[id] -- restores a soft-deleted team member. Left
// inactive (not re-activated automatically) so a restored member
// still needs an explicit "Show" before appearing in normal listings
// again -- restoring shouldn't silently re-surface someone who was
// deliberately marked inactive before also being deleted.
export async function PUT(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('team_members').update({ deleted_at: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
