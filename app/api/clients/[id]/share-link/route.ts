import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// POST /api/clients/[id]/share-link
// Generates a share_token for this client if it doesn't already have one
// (idempotent -- calling this again on a client that already has a token
// just returns the existing one, so re-sharing a link never invalidates
// one already sent to a client).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase.from('clients').select('id, share_token').eq('id', id).single();
  if (fetchErr || !existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  let token = existing.share_token;
  if (!token) {
    token = randomUUID();
    const { error: updateErr } = await supabase.from('clients').update({ share_token: token }).eq('id', id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ token, url: `/api/share/jobs/${token}` });
}

// DELETE /api/clients/[id]/share-link — revoke: clears the token, so the
// old link stops working. Generating a new one afterwards (POST) issues
// a fresh, different token.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('clients').update({ share_token: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
