import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { linkByEmail } from '@/lib/student/claims';
import { rateLimitShared } from '@/lib/rateLimitShared';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-link', { limit: 20, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.planIds) ? body.planIds.filter((x: unknown): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)) : [];
  if (!ids.length) return NextResponse.json({ error: 'Nothing selected' }, { status: 400 });
  const r = await linkByEmail({ id: s.profile.id, userId: s.userId, email: s.email }, ids);
  return NextResponse.json(r);
}
