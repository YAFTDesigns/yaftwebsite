import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const trash = new URL(request.url).searchParams.get('trash') === 'true';
  const supabase = getSupabaseAdmin();
  const query = supabase.from('lab_scripts').select('*').order('display_order');
  const { data, error } = trash
    ? await query.not('deleted_at', 'is', null)
    : await query.is('deleted_at', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scripts: data ?? [] });
}

// POST /api/admin/lab-scripts  { title, description, category_id, price? }
// Creates a new script entry with no file/thumbnail/detail image yet
// -- those are uploaded separately once the row exists.
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
  const categoryId = String(data.category_id ?? '').trim();
  const price = Number(data.price ?? 0);

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Price must be 0 or a positive number' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: category, error: catErr } = await supabase.from('lab_categories').select('name').eq('id', categoryId).single();
  if (catErr || !category) return NextResponse.json({ error: 'Category not found' }, { status: 400 });

  const { count } = await supabase.from('lab_scripts').select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
  const nextOrder = (count ?? 0) + 1;

  // tool kept in sync with the chosen category's name -- legacy
  // display field, category_id is the real source of truth now.
  const { data: row, error } = await supabase.from('lab_scripts').insert({
    title, description, category_id: categoryId, tool: category.name, price, display_order: nextOrder, active: true,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ script: row });
}

// PATCH /api/admin/lab-scripts  { id, title?, description?, category_id?, price?, active?, thumbnail_path?, detail_image_path?, youtube_url? }
// thumbnail_path/detail_image_path are settable here specifically so
// the admin UI can swap them (send each the other's current value) --
// not exposed as a general-purpose way to set arbitrary storage paths,
// just the swap.
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = String(data.title).trim();
  if (data.description !== undefined) update.description = String(data.description).trim();
  if (data.category_id !== undefined) {
    const { data: category, error: catErr } = await supabase.from('lab_categories').select('name').eq('id', data.category_id).single();
    if (catErr || !category) return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    update.category_id = data.category_id;
    update.tool = category.name;
  }
  if (data.price !== undefined) update.price = Number(data.price);
  if (data.active !== undefined) update.active = !!data.active;
  if (data.thumbnail_path !== undefined) update.thumbnail_path = data.thumbnail_path;
  if (data.detail_image_path !== undefined) update.detail_image_path = data.detail_image_path;
  if (data.youtube_url !== undefined) update.youtube_url = String(data.youtube_url).trim() || null;
  if (data.thumbnail_path !== undefined || data.detail_image_path !== undefined || data.youtube_url !== undefined) update.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase.from('lab_scripts').update(update).eq('id', data.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: row });
}

// DELETE /api/admin/lab-scripts  { id }
// Soft delete -- sets deleted_at rather than removing the row, so it
// stays recoverable via the Trash view (action: 'restore' below).
export async function DELETE(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('lab_scripts').update({ deleted_at: new Date().toISOString() }).eq('id', data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PUT /api/admin/lab-scripts  { id }
// Restores a soft-deleted script -- clears deleted_at. Separate verb
// from PATCH since PATCH already handles a wide set of partial field
// updates; keeping restore as its own explicit action avoids it being
// triggered by accident through a generic partial-update call.
export async function PUT(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('lab_scripts').update({ deleted_at: null }).eq('id', data.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
