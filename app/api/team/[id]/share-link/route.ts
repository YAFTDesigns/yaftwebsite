import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// POST /api/team/[id]/share-link
// Idempotent -- returns the existing token if one was already
// generated, same as the client share-link route, so re-sharing never
// invalidates a link already sent to someone.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase.from('team_members').select('id, share_token').eq('id', id).single();
  if (fetchErr || !existing) return NextResponse.json({ error: 'Team member not found' }, { status: 404 });

  let token = existing.share_token;
  if (!token) {
    token = randomUUID();
    const { error: updateErr } = await supabase.from('team_members').update({ share_token: token }).eq('id', id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ token, url: `/api/share/team-jobs/${token}` });
}

// DELETE /api/team/[id]/share-link — revoke, same pattern as clients.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('team_members').update({ share_token: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
