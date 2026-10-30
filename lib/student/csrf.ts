/**
 * State-changing student requests must come from our own pages. Browsers always send Origin on fetch POST/PATCH,
 * so a missing or foreign Origin is refused. Session cookies are also SameSite=Lax, which is the second layer.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
