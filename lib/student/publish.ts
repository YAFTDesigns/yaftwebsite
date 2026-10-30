import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanImageUpload } from '@/lib/imageUpload';
import { cleanText } from './safe';
import { audit } from './audit';
import { verifiedBadgeFor } from './verified';

type Admin = ReturnType<typeof getSupabaseAdmin>;

/** Copy a private image into a PUBLIC bucket (re-encoded again), only called after approval + consent. Returns the stored file name or null. */
async function copyPublic(admin: Admin, src: { privatePath?: string; googleUrl?: string }, bucket: 'site-images' | 'public-assets', folder: string, edge = 1600): Promise<string | null> {
  try {
    let bytes: ArrayBuffer;
    if (src.privatePath) {
      const { data } = await admin.storage.from('student-private').download(src.privatePath);
      if (!data) return null;
      bytes = await data.arrayBuffer();
    } else if (src.googleUrl) {
      const u = new URL(src.googleUrl);
      if (u.protocol !== 'https:' || !u.hostname.endsWith('googleusercontent.com')) return null; // never fetch arbitrary hosts (SSRF guard)
      const r = await fetch(u.toString(), { redirect: 'error', signal: AbortSignal.timeout(8000) });
      if (!r.ok || Number(r.headers.get('content-length') ?? 0) > 5_000_000) return null;
      bytes = await r.arrayBuffer();
    } else return null;
    const clean = await cleanImageUpload(new File([bytes], 'img'), edge);
    if (!clean) return null;
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${clean.ext}`;
    const { error } = await admin.storage.from(bucket).upload(`${folder}/${name}`, clean.buffer, { contentType: clean.contentType, upsert: false });
    return error ? null : name;
  } catch (e) { console.error('[publish] copy failed:', e); return null; }
}

const TOOL: Record<string, string> = { grasshopper: 'grasshopper', revit: 'rir' };
const toolFor = (slug: string) => Object.entries(TOOL).find(([k]) => slug.includes(k))?.[1] ?? 'rhino';

/** Retire any previously published row for this project (a new approved version replaces it; a withdrawal removes it). */
export async function unpublishProject(projectId: string, actor: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('student_work').update({ deleted_at: new Date().toISOString() }).eq('portal_project_id', projectId).is('deleted_at', null);
  await admin.from('student_projects').update({ published_revision_id: null }).eq('id', projectId);
  await audit({ actor_type: actor.includes('@') ? 'admin' : 'student', actor_ref: actor, action: 'project_unpublished', subject: projectId });
}

/** Publish the approved revision to Community Works. Only when the student gave publish consent. Public gets title, text, cover, gallery, first link. Never private files. */
export async function publishProject(revisionId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data: rev } = await admin.from('project_revisions').select('id, project_id, status, title, description, links, cover_path, gallery_paths').eq('id', revisionId).maybeSingle();
  if (!rev || rev.status !== 'approved') return false;
  const { data: p } = await admin.from('student_projects').select('id, course_slug, publish_consent, public_display_name, student_id, public_role, tool, category, profile_photo_path').eq('id', rev.project_id).maybeSingle();
  if (!p?.publish_consent || !p.public_display_name) return false;
  await admin.from('student_work').update({ deleted_at: new Date().toISOString() }).eq('portal_project_id', p.id).is('deleted_at', null);
  const cover = rev.cover_path ? await copyPublic(admin, { privatePath: rev.cover_path }, 'site-images', 'student-work') : null;
  const gallery: string[] = [];
  for (const g of (rev.gallery_paths ?? []).slice(0, 8)) { const n = await copyPublic(admin, { privatePath: g }, 'site-images', 'student-work'); if (n) gallery.push(n); }
  const photo = p.profile_photo_path ? await copyPublic(admin, { privatePath: p.profile_photo_path }, 'site-images', 'student-work/photos', 800) : null;
  const badge = await verifiedBadgeFor(p.student_id);
  const { error } = await admin.from('student_work').insert({ verified: badge.verified,
    name: p.public_display_name, role: p.public_role || 'YAFT Designs student', project_title: cleanText(rev.title, 120), tool: p.tool || toolFor(p.course_slug), category: p.category || 'Student project', profile_photo_url: photo,
    description: cleanText(rev.description ?? '', 300) || cleanText(rev.title, 120), image_url: cover, project_image_urls: gallery.length ? gallery : null,
    portfolio_url: (rev.links ?? [])[0] ?? null, status: 'approved', portal_project_id: p.id,
  });
  if (error) { console.error('[publish] project insert failed:', error.message); return false; }
  await admin.from('student_projects').update({ published_revision_id: rev.id }).eq('id', p.id);
  await audit({ actor_type: 'system', action: 'project_published', subject: p.id });
  return true;
}

/** Approve a student testimonial and put it on the site (existing testimonials table). */
export async function approveTestimonial(id: string, adminEmail: string): Promise<{ ok: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  const { data: t } = await admin.from('student_testimonials').select('*').eq('id', id).maybeSingle();
  if (!t || t.status !== 'submitted') return { ok: false, error: 'Not awaiting review' };
  if (!t.text_consent_at) return { ok: false, error: 'No text consent recorded' };
  const { data: course } = await admin.from('courses').select('title').eq('slug', t.course_slug).maybeSingle();
  let photo_url: string | null = null;
  if (t.photo_path && t.photo_consent_at) {
    const stored = t.photo_path.startsWith('google:')
      ? await copyPublic(admin, { googleUrl: t.photo_path.slice(7) }, 'public-assets', 'testimonials', 800)
      : await copyPublic(admin, { privatePath: t.photo_path }, 'public-assets', 'testimonials', 800);
    if (stored) photo_url = admin.storage.from('public-assets').getPublicUrl(`testimonials/${stored}`).data.publicUrl;
  }
  await admin.from('testimonials').update({ deleted_at: new Date().toISOString() }).eq('portal_testimonial_id', t.id).is('deleted_at', null);
  const badge = await verifiedBadgeFor(t.student_id);
  const { data: pub, error } = await admin.from('testimonials').insert({
    name: t.public_display_name || 'Student', role: 'Student', course_taken: course?.title ?? null, quote: t.quote, photo_url,
    linkedin_url: badge.verified ? badge.linkedinUrl : null, show_social: badge.verified && !!badge.linkedinUrl, verified: badge.verified, rating: 5.0, source: 'student_portal', status: 'approved', reviewed_at: new Date().toISOString(), portal_testimonial_id: t.id,
  }).select('id').single();
  if (error || !pub) return { ok: false, error: 'Could not publish' };
  await admin.from('student_testimonials').update({ status: 'approved', published_testimonial_id: pub.id, updated_at: new Date().toISOString() }).eq('id', t.id);
  await audit({ actor_type: 'admin', actor_ref: adminEmail, action: 'testimonial_approved', subject: t.id });
  return { ok: true };
}

export async function unpublishTestimonial(id: string, actor: string, to: 'withdrawn' | 'changes_requested' = 'withdrawn', feedback?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('testimonials').update({ deleted_at: new Date().toISOString() }).eq('portal_testimonial_id', id).is('deleted_at', null);
  await admin.from('student_testimonials').update({ status: to, published_testimonial_id: null, feedback: feedback ? cleanText(feedback, 1000) : null, updated_at: new Date().toISOString() }).eq('id', id);
  await audit({ actor_type: actor.includes('@') ? 'admin' : 'student', actor_ref: actor, action: `testimonial_${to}`, subject: id });
}
