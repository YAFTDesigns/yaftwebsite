import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// GET /api/admin/invoices?trash=true   — list active or trashed invoices
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const trash = new URL(request.url).searchParams.get('trash') === 'true';
  const supabase = getSupabaseAdmin();

  const { data, error } = trash
    ? await supabase.from('invoices').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
    : await supabase.from('invoices').select('*').is('deleted_at', null).order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// PATCH /api/admin/invoices
// { action: 'update_payment', id, advance }
// { action: 'soft_delete',    id }
// { action: 'bulk_soft_delete', ids }
// { action: 'restore',        id }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  if (body.action === 'update_payment') {
    const { id, advance } = body;
    if (!id || typeof advance !== 'number') {
      return NextResponse.json({ error: 'Missing id or advance' }, { status: 400 });
    }
    const { data: inv, error: fetchErr } = await supabase
      .from('invoices').select('total').eq('id', id).single();
    if (fetchErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const balance = inv.total - advance;
    const { error } = await supabase.from('invoices').update({ advance, balance }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, balance });
  }

  if (body.action === 'soft_delete') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { error } = await supabase
      .from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'bulk_soft_delete') {
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing ids array' }, { status: 400 });
    }
    const { error } = await supabase
      .from('invoices').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'restore') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const { error } = await supabase.from('invoices').update({ deleted_at: null }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
