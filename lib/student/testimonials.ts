import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanName, cleanText } from './safe';
import { ownsPlan } from './projects';
import { audit } from './audit';

export const TESTIMONIAL_NOTICE_VERSION = '2026-10-v1';

export type TestimonialView = { id: string; planId: string; courseSlug: string; status: string; quote: string | null; publicName: string | null; photo: 'upload' | 'google' | 'none'; feedback: string | null };

/** Photo rule: the student's own upload wins; otherwise their Google picture is used (the form says so before they submit);
 *  "none" means no photo at all. Stored in photo_path: a private-bucket path, 'google:<https url>', or null. */
export function resolvePhoto(opts: { uploadedPath: string | null; googleAvatar: string | null; noPhoto: boolean }): string | null {
  if (opts.noPhoto) return null;
  if (opts.uploadedPath) return opts.uploadedPath;
  return opts.googleAvatar ? `google:${opts.googleAvatar}` : null;
}
export const photoKind = (p: string | null): 'upload' | 'google' | 'none' => (!p ? 'none' : p.startsWith('google:') ? 'google' : 'upload');

export async function loadTestimonials(studentId: string): Promise<TestimonialView[]> {
  const { data } = await getSupabaseAdmin().from('student_testimonials').select('id, plan_id, course_slug, status, quote, public_display_name, photo_path, feedback').eq('student_id', studentId);
  return (data ?? []).map((t) => ({ id: t.id, planId: t.plan_id, courseSlug: t.course_slug, status: t.status, quote: t.quote, publicName: t.public_display_name, photo: photoKind(t.photo_path), feedback: t.status === 'changes_requested' ? t.feedback : null }));
}

export async function submitTestimonial(student: { id: string }, googleAvatar: string | null, input: { planId: string; courseSlug: string; quote: unknown; publicName: unknown; noPhoto: boolean }): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!(await ownsPlan(student.id, input.planId))) return { ok: false, error: 'Not found', status: 404 };
  const admin = getSupabaseAdmin();
  const { data: plan } = await admin.from('course_payment_plans').select('course_slugs').eq('id', input.planId).maybeSingle();
  if (!plan?.course_slugs?.includes(input.courseSlug)) return { ok: false, error: 'Not found', status: 404 };
  const quote = cleanText(input.quote, 1200), name = cleanName(input.publicName);
  if (quote.length < 20) return { ok: false, error: 'Please write at least a couple of sentences.', status: 400 };
  if (!name) return { ok: false, error: 'Choose the name to show with your testimonial.', status: 400 };
  const { data: existing } = await admin.from('student_testimonials').select('id, status, photo_path').eq('plan_id', input.planId).eq('course_slug', input.courseSlug).maybeSingle();
  if (existing?.status === 'submitted') return { ok: false, error: 'Your testimonial is waiting for review.', status: 409 };
  const uploaded = existing?.photo_path && !existing.photo_path.startsWith('google:') ? existing.photo_path : null;
  const photo = resolvePhoto({ uploadedPath: uploaded, googleAvatar, noPhoto: input.noPhoto });
  const now = new Date().toISOString();
  // Any edit goes back to review (an approved one is re-approved), per the moderation rule.
  const row = { student_id: student.id, plan_id: input.planId, course_slug: input.courseSlug, status: 'submitted', quote, public_display_name: name, photo_path: photo, text_consent_at: now, photo_consent_at: photo ? now : null, updated_at: now };
  const { data: saved, error } = existing
    ? await admin.from('student_testimonials').update(row).eq('id', existing.id).select('id').single()
    : await admin.from('student_testimonials').insert(row).select('id').single();
  if (error || !saved) return { ok: false, error: 'Could not save', status: 500 };
  await admin.from('student_consents').insert([
    { student_id: student.id, purpose: 'testimonial_text', version: TESTIMONIAL_NOTICE_VERSION, granted: true, subject_id: saved.id },
    { student_id: student.id, purpose: 'testimonial_photo', version: TESTIMONIAL_NOTICE_VERSION, granted: !!photo, subject_id: saved.id },
  ]);
  await audit({ actor_type: 'student', actor_ref: student.id, action: 'testimonial_submitted', subject: saved.id, detail: { photo: photoKind(photo) } });
  return { ok: true };
}
