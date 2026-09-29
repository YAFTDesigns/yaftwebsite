import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const VALID_STATUS = ['new', 'contacted', 'interested', 'confirmed', 'lost'];

// PATCH /api/admin/leads/[id]  { declined?, status?, notes?, follow_up_date? }
// declined stays the separate, cron-checked "stop contacting" flag
// (see its own comment history); status/notes/follow_up_date are the
// lead workflow layered on top, edited from both Leads and Enquiries.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.declined === 'boolean') update.declined = body.declined;
  if (typeof body.status === 'string') {
    if (!VALID_STATUS.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    update.status = body.status;
  }
  if (typeof body.notes === 'string') update.notes = body.notes.slice(0, 2000) || null;
  if (body.follow_up_date === null || typeof body.follow_up_date === 'string') {
    update.follow_up_date = body.follow_up_date || null;
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('leads').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
