import { NextRequest, NextResponse } from 'next/server';

interface Window {
  count: number;
  start: number;
}

const store = new Map<string, Window>();

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (now - win.start > 60_000) store.delete(key);
  }
}, 5 * 60 * 1000);

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
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const key = `${request.nextUrl.pathname}:${ip}`;
  const now = Date.now();
  const win = store.get(key);

  if (!win || now - win.start > windowMs) {
    store.set(key, { count: 1, start: now });
    return null;
  }

  win.count += 1;
  if (win.count > limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((win.start + windowMs - now) / 1000)),
        },
      }
    );
  }

  return null;
}
