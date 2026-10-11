import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const TORTOISE_DOWNLOAD_PATH = '/downloads/Tortoise_v1.0.3_Free.zip';
export const TORTOISE_DOWNLOAD_KEY = 'tortoise-free';

/**
 * Downloads counted on this site, plus an optional starting number the owner sets
 * (TORTOISE_DOWNLOADS_OFFSET, for example the Food4Rhino total). Returns null if it can't be read.
 */
export async function getTortoiseDownloadCount(): Promise<number | null> {
  const offset = Math.max(0, parseInt(process.env.TORTOISE_DOWNLOADS_OFFSET ?? '0', 10) || 0);
  try {
    const { data, error } = await getSupabaseAdmin().from('download_counters').select('count').eq('key', TORTOISE_DOWNLOAD_KEY).maybeSingle();
    if (error) throw error;
    return Number(data?.count ?? 0) + offset;
  } catch (err) {
    console.error('[tortoise-downloads] read failed:', err);
    return offset > 0 ? offset : null;
  }
}
