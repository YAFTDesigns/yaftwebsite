import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const CATEGORIES = ['facade', 'bim-automation', 'computational-design', 'wearables', 'product'] as const;

// GET /api/admin/projects
export async function GET(request: NextRequest) {
  const trash = new URL(request.url).searchParams.get('trash') === 'true';
  const supabase = getSupabaseAdmin();
  const query = supabase.from('portfolio_projects').select('*').order('display_order', { ascending: true });
  const { data, error } = trash
    ? await query.not('deleted_at', 'is', null)
    : await query.is('deleted_at', null);

  if (error) {
    console.error('[projects-api] GET failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/admin/projects  { slug, title, category, location, summary, description, ... }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.slug || !body?.title || !body?.category || !body?.location || !body?.summary || !body?.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('portfolio_projects').insert({
    slug: body.slug,
    title: body.title,
    category: body.category,
    location: body.location,
    client_or_collab: body.client_or_collab ?? null,
    year: body.year ?? null,
    summary: body.summary,
    description: body.description,
    cover_image_path: body.cover_image_path ?? null,
    gallery: body.gallery ?? [],
    display_order: body.display_order ?? 0,
    featured: !!body.featured,
    active: body.active ?? false,
  });

  if (error) {
    console.error('[projects-api] POST failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/projects  { id, ...fields }
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  if (body.category && !CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const { id: _id, ...rest } = body;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('portfolio_projects').update(rest).eq('id', id);

  if (error) {
    console.error('[projects-api] PATCH failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/projects  { id }
// Soft delete -- sets deleted_at rather than removing the row, so it
// stays recoverable via the Trash view (PUT below restores it).
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('portfolio_projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) {
    console.error('[projects-api] DELETE failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PUT /api/admin/projects  { id }
// Restores a soft-deleted project -- clears deleted_at.
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('portfolio_projects').update({ deleted_at: null }).eq('id', id);

  if (error) {
    console.error('[projects-api] PUT (restore) failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
