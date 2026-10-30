import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { audit } from '@/lib/student/audit';

// Choose whether the "Verified student" shield (and LinkedIn link) may be shown next to this student's published testimonials and projects.
// It can only be switched on when LinkedIn is really connected. Switching off takes effect on the next publish and via the Training area.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const on = b.on === true;
  if (on && !s.linkedinConnected) return NextResponse.json({ error: 'Connect your LinkedIn account first.' }, { status: 400 });
  const a = getSupabaseAdmin();
  await a.from('student_consents').insert({ student_id: s.profile.id, purpose: 'public_verified_badge', version: '2026-10-v1', granted: on });
  if (!on) {
    // take the shield (and LinkedIn link) off anything already public
    await a.from('testimonials').update({ verified: false, show_social: false }).in('portal_testimonial_id', ((await a.from('student_testimonials').select('id').eq('student_id', s.profile.id)).data ?? []).map((t) => t.id)).is('deleted_at', null);
    await a.from('student_work').update({ verified: false }).in('portal_project_id', ((await a.from('student_projects').select('id').eq('student_id', s.profile.id)).data ?? []).map((p) => p.id)).is('deleted_at', null);
  }
  await audit({ actor_type: 'student', actor_ref: s.profile.id, action: on ? 'badge_consent_on' : 'badge_consent_off' });
  return NextResponse.json({ ok: true, on });
}
