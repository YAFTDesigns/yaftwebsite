import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// POST /api/admin/leads/[id]/notes  { body }  -- append one note to the lead's history.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const text = typeof json?.body === 'string' ? json.body.trim().slice(0, 2000) : '';
  if (!text) return NextResponse.json({ error: 'Note is empty' }, { status: 400 });
  const { error } = await getSupabaseAdmin().from('lead_notes').insert({ lead_id: id, kind: 'note', body: text });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
