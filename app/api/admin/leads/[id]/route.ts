import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// PATCH /api/admin/leads/[id]  { declined: boolean }
// Manual, Yokes-controlled flag -- the system has no way to read his
// inbox and detect a reply declining, so this is how "don't follow up
// with this person again" gets recorded. Checked by the lead
// follow-up reminder cron before it ever emails someone.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.declined !== 'boolean') {
    return NextResponse.json({ error: 'Missing or invalid declined value' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('leads').update({ declined: body.declined }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
