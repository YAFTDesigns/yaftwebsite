import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/labs/[id]/download
// Public, no auth -- this is what "Download" links to on the live
// site. Increments download_count (the "how many have viewed" number
// shown on each card) here, at the moment of an actual download, not
// on page view -- a page view isn't the same signal as someone
// genuinely downloading the file.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(request, { limit: 30, windowMs: 60000 });
  if (limited) return limited;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: script, error } = await supabase
    .from('lab_scripts')
    .select('id, title, file_path, download_count, active')
    .eq('id', id)
    .eq('active', true)
    .maybeSingle();

  if (error || !script || !script.file_path) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  const { data: signedUrlData, error: signError } = await supabase.storage
    .from('lab-files')
    .createSignedUrl(script.file_path, 60);

  if (signError || !signedUrlData) {
    console.error('[labs-download] failed to sign url:', signError);
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 });
  }

  // Awaited, not fire-and-forget -- on Vercel's serverless runtime the
  // function can be torn down immediately after the response is sent,
  // so an un-awaited update here could simply never complete. The
  // extra latency is negligible (one small update query) against the
  // reliability this buys.
  const { error: incErr } = await supabase
    .from('lab_scripts').update({ download_count: (script.download_count ?? 0) + 1 }).eq('id', id);
  if (incErr) console.error('[labs-download] count increment failed:', incErr);

  return NextResponse.redirect(signedUrlData.signedUrl);
}
