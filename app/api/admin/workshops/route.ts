import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export async function GET() {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('workshops').select('*').order('display_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workshops: data ?? [] });
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
  for (const field of ['place', 'title', 'role', 'description'] as const) {
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
