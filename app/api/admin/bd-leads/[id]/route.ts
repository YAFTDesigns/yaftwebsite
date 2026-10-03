import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { FIELDS } from '../route';

const VALID_STATUS = ['researched','qualified','contact_identified','outreach_ready','contacted','replied','discussion','proposal','negotiation','won','lost'];
const VALID_PRIORITY = ['high','medium','low'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  if (body.status !== undefined && !VALID_STATUS.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  if (body.priority !== undefined && !VALID_PRIORITY.includes(body.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });

  // Explicit allowlist, same list the create route uses, rather than
  // spreading the whole request body into the update -- this route is
  // already admin-gated, but an unfiltered spread is still worth
  // avoiding on principle (a stray field in the payload, or a future
  // bug elsewhere, shouldn't be able to write an arbitrary column).
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of FIELDS) if (body[f] !== undefined) update[f] = body[f];

  const { error } = await getSupabaseAdmin().from('bd_leads').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
