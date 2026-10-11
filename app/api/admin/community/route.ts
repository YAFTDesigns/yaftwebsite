import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isCommunityTable } from '@/lib/admin/communityTables';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// GET /api/admin/community?table=student_work&status=pending&trash=true
// GET /api/admin/community?table=partners (no status filter — returns all)
// GET /api/admin/community?counts=true  (the six status counts, head-only: no rows)
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const status = searchParams.get('status');
  const trash = searchParams.get('trash') === 'true';

  if (searchParams.get('counts') === 'true') {
    const supabase = getSupabaseAdmin();
    const count = async (t: 'student_work' | 'publications', s: 'pending' | 'approved' | 'rejected') => {
      const { count: n, error } = await supabase
        .from(t).select('id', { count: 'exact', head: true }).eq('status', s).is('deleted_at', null);
      if (error) console.error(`[community-api] count ${t}/${s} failed:`, error);
      return n ?? 0; // a failed count shows as 0, same as the per-list fetches it replaces
    };
    const [sw_pending_all, pub_pending_all, sw_approved, sw_rejected, pub_approved, pub_rejected] = await Promise.all([
      count('student_work', 'pending'), count('publications', 'pending'),
      count('student_work', 'approved'), count('student_work', 'rejected'),
      count('publications', 'approved'), count('publications', 'rejected'),
    ]);
    return NextResponse.json({ counts: { sw_approved, sw_pending_all, sw_rejected, pub_approved, pub_pending_all, pub_rejected } });
  }

  if (!isCommunityTable(table)) {
    return NextResponse.json({ error: 'Invalid or missing table parameter' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let query = supabase.from(table).select('*');
  query = trash ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);

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
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
// Soft delete -- sets deleted_at rather than removing the row, so it
// stays recoverable via the Trash view (PUT below restores it).
export async function DELETE(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);

  if (error) {
    console.error(`[community-api] DELETE ${table}/${id} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PUT /api/admin/community  { table, id }
// Restores a soft-deleted row -- clears deleted_at.
export async function PUT(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);

  if (error) {
    console.error(`[community-api] PUT (restore) ${table}/${id} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/admin/community  { table, insert: {...} }
// Used for adding new partners from the admin panel.
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
