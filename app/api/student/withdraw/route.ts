import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { unpublishProject, unpublishTestimonial } from '@/lib/student/publish';

// A student takes down their own published project or testimonial. Ownership is checked against the signed-in student.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.id) || !['project', 'testimonial'].includes(b.kind)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const a = getSupabaseAdmin();
  if (b.kind === 'project') {
    const { data } = await a.from('student_projects').select('id').eq('id', b.id).eq('student_id', s.profile.id).maybeSingle();
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await a.from('student_projects').update({ publish_consent: false }).eq('id', b.id);
    await a.from('student_consents').insert({ student_id: s.profile.id, purpose: 'project_publication', version: '2026-10-v1', granted: false, subject_id: b.id });
    await unpublishProject(b.id, s.profile.id);
  } else {
    const { data } = await a.from('student_testimonials').select('id').eq('id', b.id).eq('student_id', s.profile.id).maybeSingle();
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await a.from('student_consents').insert([{ student_id: s.profile.id, purpose: 'testimonial_text', version: '2026-10-v1', granted: false, subject_id: b.id }, { student_id: s.profile.id, purpose: 'testimonial_photo', version: '2026-10-v1', granted: false, subject_id: b.id }]);
    await unpublishTestimonial(b.id, s.profile.id, 'withdrawn');
  }
  return NextResponse.json({ ok: true });
}
