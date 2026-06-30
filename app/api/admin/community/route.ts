import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isCommunityTable } from '@/lib/admin/communityTables';

// GET /api/admin/community?table=student_work&status=pending
// GET /api/admin/community?table=partners (no status filter — returns all)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const status = searchParams.get('status');

  if (!isCommunityTable(table)) {
    return NextResponse.json({ error: 'Invalid or missing table parameter' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let query = supabase.from(table).select('*');

  if (status) query = query.eq('status', status);

  query = table === 'partners'
    ? query.order('display_order', { ascending: true })
    : query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error(`[community-api] GET ${table} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// PATCH /api/admin/community  { table, id, updates: {...} }
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const table = body?.table;
  const id = body?.id;
  const updates = body?.updates;

  if (!isCommunityTable(table)) {
    return NextResponse.json({ error: 'Invalid or missing table parameter' }, { status: 400 });
  }
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  if (!updates || typeof updates !== 'object') {
    return NextResponse.json({ error: 'Missing updates object' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).update(updates).eq('id', id);

  if (error) {
    console.error(`[community-api] PATCH ${table}/${id} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/community  { table, id }
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const table = body?.table;
  const id = body?.id;

  if (!isCommunityTable(table)) {
    return NextResponse.json({ error: 'Invalid or missing table parameter' }, { status: 400 });
  }
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq('id', id);

  if (error) {
    console.error(`[community-api] DELETE ${table}/${id} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/admin/community  { table, insert: {...} }
// Used for adding new partners from the admin panel.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const table = body?.table;
  const insert = body?.insert;

  if (!isCommunityTable(table)) {
    return NextResponse.json({ error: 'Invalid or missing table parameter' }, { status: 400 });
  }
  if (!insert || typeof insert !== 'object') {
    return NextResponse.json({ error: 'Missing insert object' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from(table).insert(insert).select('id').single();

  if (error) {
    console.error(`[community-api] POST ${table} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
