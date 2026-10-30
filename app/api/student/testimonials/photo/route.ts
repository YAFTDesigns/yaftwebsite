import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { ownsPlan } from '@/lib/student/projects';
import { cleanImageUpload } from '@/lib/imageUpload';
import { rateLimitShared } from '@/lib/rateLimitShared';

// The student's own testimonial photo: re-encoded (real format check, metadata stripped) into the private bucket.
// It replaces the Google picture on their next submit. Nothing becomes public until a moderator approves the testimonial.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-testimonial-photo', { limit: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file'); const planId = String(form?.get('planId') ?? ''); const courseSlug = String(form?.get('courseSlug') ?? '');
  if (!(file instanceof File) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Choose an image under 10 MB.' }, { status: 400 });
  if (!(await ownsPlan(s.profile.id, planId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const img = await cleanImageUpload(file, 800);
  if (!img) return NextResponse.json({ error: 'That is not a usable image (JPG, PNG, WebP or GIF).' }, { status: 415 });
  const admin = getSupabaseAdmin();
  const path = `${s.profile.id}/testimonials/${randomUUID()}.webp`;
  const up = await admin.storage.from('student-private').upload(path, img.buffer, { contentType: img.contentType, upsert: false });
  if (up.error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  // Remember it on the draft; a testimonial row is created if this is the first thing saved.
  const { data: ex } = await admin.from('student_testimonials').select('id, status').eq('plan_id', planId).eq('course_slug', courseSlug).maybeSingle();
  if (ex?.status === 'submitted') return NextResponse.json({ error: 'Your testimonial is waiting for review.' }, { status: 409 });
  if (ex) await admin.from('student_testimonials').update({ photo_path: path }).eq('id', ex.id);
  else await admin.from('student_testimonials').insert({ student_id: s.profile.id, plan_id: planId, course_slug: courseSlug, status: 'draft', photo_path: path });
  return NextResponse.json({ ok: true });
}
