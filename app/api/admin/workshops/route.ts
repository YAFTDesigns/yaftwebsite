import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function GET() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('workshops').select('*').order('display_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workshops: data ?? [] });
}

// POST /api/admin/workshops  { key, num, place, title, role, description? }
// Creates a brand-new workshop entry (a new institution/engagement),
// distinct from PATCH which only edits an existing one's text fields.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const key = String(data.key ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const place = String(data.place ?? '').trim();
  const title = String(data.title ?? '').trim();
  if (!key) return NextResponse.json({ error: 'A short key (letters/numbers/dashes only) is required' }, { status: 400 });
  if (!place) return NextResponse.json({ error: 'Place is required' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { count } = await supabase.from('workshops').select('id', { count: 'exact', head: true });
  const nextOrder = (count ?? 0) + 1;

  const { data: row, error } = await supabase.from('workshops').insert({
    key,
    num: data.num || String(nextOrder).padStart(2, '0'),
    place,
    title,
    role: data.role || '',
    description: data.description || '',
    photos: [],
    display_order: nextOrder,
    active: true,
  }).select('*').single();

  if (error) {
    const message = error.code === '23505' ? `A workshop with key "${key}" already exists` : error.message;
    return NextResponse.json({ error: message }, { status: error.code === '23505' ? 409 : 500 });
  }
  return NextResponse.json({ workshop: row });
}

// PATCH /api/admin/workshops  { key, place?, title?, role?, description? }
// Text-field edits, same table the public /services page reads from.
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json().catch(() => null);
  if (!data?.key) return NextResponse.json({ error: 'key is required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const field of ['num', 'place', 'title', 'role', 'description', 'active'] as const) {
    if (data[field] !== undefined) update[field] = data[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase.from('workshops').update(update).eq('key', data.key).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workshop: row });
}
