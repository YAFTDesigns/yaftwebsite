import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitShared } from '@/lib/rateLimitShared';
import { TORTOISE_DOWNLOAD_PATH, TORTOISE_DOWNLOAD_KEY } from '@/lib/tortoiseDownloads';

// GET /api/tortoise/download -> counts one download, then redirects to the free-trial zip.
// Counting never blocks the download: if anything fails the visitor still gets the file.
export async function GET(request: NextRequest) {
  const limited = await rateLimitShared(request, 'tortoise-download', { limit: 20, windowMs: 60_000 });
  if (!limited) {
    try {
      const { error } = await getSupabaseAdmin().rpc('bump_download', { p_key: TORTOISE_DOWNLOAD_KEY });
      if (error) console.error('[tortoise-download] count failed:', error);
    } catch (err) {
      console.error('[tortoise-download] count failed:', err);
    }
  }
  return NextResponse.redirect(new URL(TORTOISE_DOWNLOAD_PATH, request.url), 302);
}
