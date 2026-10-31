import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';

// Opt in to (or out of) newsletter and update emails. Off unless the student ticks it; each choice is a new consent row.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  await getSupabaseAdmin().from('student_consents').insert({ student_id: s.profile.id, purpose: 'marketing', version: '2026-10-v1', granted: b.on === true });
  return NextResponse.json({ ok: true, on: b.on === true });
}
