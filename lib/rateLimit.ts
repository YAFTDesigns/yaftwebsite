import { NextRequest, NextResponse } from 'next/server';

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();
const SWEEP_AT = 1000; // purge expired windows once the map grows past this

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Returns a 429 NextResponse if the IP has exceeded the limit,
 * or null if the request is allowed through.
 *
 * Usage:
 *   const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export function rateLimit(
  request: NextRequest,
  { limit, windowMs }: { limit: number; windowMs: number }
): NextResponse | null {
  const key = `${request.nextUrl.pathname}:${clientIp(request)}`;
  const now = Date.now();
  const win = store.get(key);

  if (!win || now > win.resetAt) {
    if (store.size >= SWEEP_AT) {
      for (const [k, w] of store) if (now > w.resetAt) store.delete(k);
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  win.count += 1;
  if (win.count > limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((win.resetAt - now) / 1000)) } }
    );
  }

  return null;
}
