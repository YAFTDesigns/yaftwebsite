import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export async function GET() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('lab_categories').select('*').order('display_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

// POST /api/admin/lab-categories  { name }
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  const name = String(data?.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { count } = await supabase.from('lab_categories').select('id', { count: 'exact', head: true });
  const { data: row, error } = await supabase
    .from('lab_categories').insert({ name, display_order: (count ?? 0) + 1 }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: row });
}

// PATCH /api/admin/lab-categories  { id, name?, display_order? }
// This is the "editable after publishing" rename/reorder action.
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    update.name = name;
  }
  if (data.display_order !== undefined) update.display_order = Number(data.display_order);

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase.from('lab_categories').update(update).eq('id', data.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: row });
}

// DELETE /api/admin/lab-categories  { id }
// Scripts in this category aren't deleted -- category_id just goes
// null on them (the FK is ON DELETE SET NULL), same fallback pattern
// used elsewhere on this site for soft references.
export async function DELETE(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('lab_categories').delete().eq('id', data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
