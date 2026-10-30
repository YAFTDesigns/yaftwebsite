import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { interestTrackingOn } from '@/lib/student/interest';

export async function GET() {
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  return NextResponse.json({ on: await interestTrackingOn(s.profile.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
// Opt in or out of remembering which courses a signed-in student looks at. Each choice is a new consent row (version + time).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  await getSupabaseAdmin().from('student_consents').insert({ student_id: s.profile.id, purpose: 'course_interest_tracking', version: '2026-10-v1', granted: b.on === true });
  if (b.on !== true) await getSupabaseAdmin().from('course_interest_events').delete().eq('student_id', s.profile.id);
  return NextResponse.json({ ok: true, on: b.on === true });
}
