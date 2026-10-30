import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { planTokenFrom, requestClaimLink } from '@/lib/student/claims';
import { rateLimitShared } from '@/lib/rateLimitShared';

// Always the same answer, whether or not a plan exists, so this cannot be used to probe for enrolments.
const GENERIC = { ok: true, message: 'If that payment link is valid and not already linked, we have emailed a confirmation link to the billing address on it.' };

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-claim-req', { limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const token = planTokenFrom(body.link);
  if (token) await requestClaimLink({ id: s.profile.id }, token);
  return NextResponse.json(GENERIC);
}
