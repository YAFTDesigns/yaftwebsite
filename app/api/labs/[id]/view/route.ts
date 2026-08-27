import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

// POST /api/labs/[id]/view
// Public, no auth -- called client-side the moment a script's detail
// view is opened (sidebar title or grid thumbnail click), separate
// from download_count which only increments on an actual download.
// No dedup: same simple increment-every-time pattern download_count
// already uses, for consistency between the two counters.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, { limit: 60, windowMs: 60000 });
  if (limited) return limited;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: script, error: fetchErr } = await supabase
    .from('lab_scripts')
    .select('id, view_count')
    .eq('id', id)
    .eq('active', true)
    .maybeSingle();

  if (fetchErr || !script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from('lab_scripts').update({ view_count: (script.view_count ?? 0) + 1 }).eq('id', id);
  if (updateErr) {
    console.error('[labs-view] count increment failed:', updateErr);
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
