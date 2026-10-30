import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { submitTestimonial } from '@/lib/student/testimonials';
import { rateLimitShared } from '@/lib/rateLimitShared';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-testimonial', { limit: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  if (typeof b.planId !== 'string' || typeof b.courseSlug !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const r = await submitTestimonial({ id: s.profile.id }, s.googleAvatar, { planId: b.planId, courseSlug: b.courseSlug, quote: b.quote, publicName: b.publicName, noPhoto: b.noPhoto === true });
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
