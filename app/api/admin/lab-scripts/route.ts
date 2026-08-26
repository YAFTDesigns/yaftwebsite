import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function GET() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('lab_scripts').select('*').order('display_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scripts: data ?? [] });
}

// POST /api/admin/lab-scripts  { title, description, tool, price? }
// Creates a new script entry with no file/thumbnail yet -- those are
// uploaded separately via /api/admin/lab-scripts/[id]/file and
// /api/admin/lab-scripts/[id]/thumbnail once the row exists.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const title = String(data.title ?? '').trim();
  const description = String(data.description ?? '').trim();
  const tool = String(data.tool ?? 'Grasshopper').trim();
  const price = Number(data.price ?? 0);

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Price must be 0 or a positive number' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { count } = await supabase.from('lab_scripts').select('id', { count: 'exact', head: true });
  const nextOrder = (count ?? 0) + 1;

  const { data: row, error } = await supabase.from('lab_scripts').insert({
    title, description, tool, price, display_order: nextOrder, active: true,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ script: row });
}

// PATCH /api/admin/lab-scripts  { id, title?, description?, tool?, price?, active? }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = String(data.title).trim();
  if (data.description !== undefined) update.description = String(data.description).trim();
  if (data.tool !== undefined) update.tool = String(data.tool).trim();
  if (data.price !== undefined) update.price = Number(data.price);
  if (data.active !== undefined) update.active = !!data.active;

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase.from('lab_scripts').update(update).eq('id', data.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: row });
}

// DELETE /api/admin/lab-scripts  { id }
export async function DELETE(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('lab_scripts').delete().eq('id', data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
