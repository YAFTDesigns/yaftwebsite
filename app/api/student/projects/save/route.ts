import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { saveDraft } from '@/lib/student/projects';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.planId !== 'string' || typeof b.courseSlug !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const r = await saveDraft({ id: s.profile.id }, b.planId, b.courseSlug, b);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
