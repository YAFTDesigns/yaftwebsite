import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { claimByBill } from '@/lib/student/legacyBill';
import { rateLimitShared } from '@/lib/rateLimitShared';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-claim-bill', { limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  const r = await claimByBill({ id: s.profile.id, userId: s.userId, email: s.email }, b.billNo, b.courseSlug);
  if (r === 'invalid') return NextResponse.json({ error: 'Enter your bill number (like YAFT-102026-21) and choose your course.' }, { status: 400 });
  if (r === 'linked') return NextResponse.json({ ok: true, linked: true, message: 'Done. Your course is now in your portal.' });
  return NextResponse.json({ ok: true, linked: false, message: 'If that bill number is valid and not already linked, we have emailed a confirmation link to the billing address on it, or will link it by hand.' });
}
