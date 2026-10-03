import { timingSafeEqual } from 'crypto';

// Vercel Cron authenticates by sending "Authorization: Bearer <CRON_SECRET>",
// and only does so when a CRON_SECRET env var exists on the project. That
// is the one documented mechanism. An "x-vercel-cron" header is NOT
// documented and is trivially spoofable by anyone, so it is deliberately
// not trusted here. If CRON_SECRET is unset, every call is refused.
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? '';
  if (secret.length === 0) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
