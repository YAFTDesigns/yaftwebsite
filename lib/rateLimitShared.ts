import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Rate limit shared across all serverless instances (counter lives in the database).
 * If the database check itself fails we fall back to the per-instance limiter, so a database
 * hiccup never blocks a paying customer or a licence check.
 */
export async function rateLimitShared(
  request: NextRequest,
  name: string,
  opts: { limit: number; windowMs: number },
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  try {
    const { data, error } = await getSupabaseAdmin().rpc('rate_limit_hit', {
      p_key: `${name}:${ip}`, p_limit: opts.limit, p_window_seconds: Math.ceil(opts.windowMs / 1000),
    });
    if (error || typeof data !== 'boolean') throw error ?? new Error('bad rate limit reply');
    if (data) return null;
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(opts.windowMs / 1000)) } },
    );
  } catch (err) {
    console.error('[rateLimitShared] falling back to in-memory limiter:', err);
    return rateLimit(request, opts);
  }
}
