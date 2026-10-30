import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { recordInterest } from '@/lib/student/interest';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ ok: true }); // anonymous: nothing is recorded
  const b = await req.json().catch(() => ({}));
  if (typeof b.slug !== 'string' || !['viewed', 'enroll_clicked'].includes(b.event)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  await recordInterest(s.profile.id, b.slug, b.event);
  return NextResponse.json({ ok: true });
}
