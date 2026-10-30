import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { redeemClaim } from '@/lib/student/claims';
import { rateLimitShared } from '@/lib/rateLimitShared';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-claim-redeem', { limit: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const r = await redeemClaim({ id: s.profile.id, userId: s.userId }, body.token);
  return r === 'linked' ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'This link is not valid any more. Ask for a new one or contact us.' }, { status: 400 });
}
