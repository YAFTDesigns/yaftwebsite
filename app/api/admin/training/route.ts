import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { adminEmail } from '@/lib/admin/adminEmail';
import { sameOrigin } from '@/lib/student/csrf';
import { cleanText } from '@/lib/student/safe';
import { audit } from '@/lib/student/audit';
import { issueCertificateIfEligible } from '@/lib/student/issueCertificate';
import { approveTestimonial, unpublishTestimonial } from '@/lib/student/publish';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// Training area data. Admin only (allow-listed AND email-verified). Read-only except through the POST actions below, each of which is audited.
export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const a = getSupabaseAdmin();
  const [students, links, claims, courses, rules, certs, testimonials, events] = await Promise.all([
    a.from('students').select('id, user_id, display_name, certificate_name, created_at, deleted_at').order('created_at', { ascending: false }).limit(300),
    a.from('student_enrolments').select('student_id, plan_id, linked_via, linked_at, course_payment_plans(description, client_email, status)').limit(1000),
    a.from('claim_reviews').select('id, created_at, user_id, plan_id, note, status').eq('status', 'pending').order('created_at').limit(100),
    a.from('courses').select('slug, title, fee_inr, checkout_enabled').order('title'),
    a.from('course_rules').select('*'),
    a.from('certificates').select('id, certificate_id, student_name, course_suffix, issue_date, revoked, revoked_reason, student_id, plan_id, course_slug, issued_by').order('created_at', { ascending: false }).limit(200),
    a.from('student_testimonials').select('id, plan_id, course_slug, status, quote, public_display_name, photo_path, text_consent_at, photo_consent_at, feedback').in('status', ['submitted', 'approved']).order('updated_at', { ascending: false }).limit(100),
    a.from('portal_audit_events').select('id, created_at, actor_type, actor_ref, action, subject').order('id', { ascending: false }).limit(100),
  ]);
  return NextResponse.json({ students: students.data ?? [], links: links.data ?? [], claims: claims.data ?? [], courses: courses.data ?? [], rules: rules.data ?? [], certificates: certs.data ?? [], testimonials: (testimonials.data ?? []).map((t) => ({ ...t, photo: t.photo_path ? (t.photo_path.startsWith('google:') ? 'google' : 'upload') : 'none', photo_path: undefined })), audit: events.data ?? [] }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const who = (await adminEmail()) ?? 'admin';
  const b = await req.json().catch(() => ({}));
  const a = getSupabaseAdmin();
  const done = async (action: string, subject: string | null, extra: Record<string, unknown> = {}) => { await audit({ actor_type: 'admin', actor_ref: who, action, subject, detail: extra }); return NextResponse.json({ ok: true, ...extra }); };

  switch (b.action) {
    case 'set_rule': {
      if (typeof b.slug !== 'string' || b.slug.length > 80) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const row = { course_slug: b.slug, requires_full_payment: b.requires_full_payment !== false, batch_label: cleanText(b.batch_label, 80) || null, starts_on: day(b.starts_on), ends_on: day(b.ends_on), balance_due_on: day(b.balance_due_on),
        cert_key: ['rhino', 'grasshopper', 'default'].includes(b.cert_key) ? b.cert_key : null, cert_suffix: cleanText(b.cert_suffix, 60).toUpperCase() || null, cert_hours: /^\d{1,3}$/.test(String(b.cert_hours ?? '')) ? String(b.cert_hours) : null, updated_at: new Date().toISOString(), updated_by: who };
      const { error } = await a.from('course_rules').upsert(row, { onConflict: 'course_slug' });
      return error ? NextResponse.json({ error: 'Could not save' }, { status: 500 }) : done('course_rule_saved', b.slug, { requires_full_payment: row.requires_full_payment });
    }
    case 'resolve_claim': {
      if (!uuid(b.reviewId) || !['approved', 'rejected'].includes(b.decision)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const { data: r } = await a.from('claim_reviews').select('id, user_id, plan_id, status').eq('id', b.reviewId).maybeSingle();
      if (!r || r.status !== 'pending') return NextResponse.json({ error: 'Not pending' }, { status: 409 });
      if (b.decision === 'approved') {
        if (!r.plan_id) return NextResponse.json({ error: 'This request has no payment attached, so there is nothing to link.' }, { status: 400 });
        const { data: st } = await a.from('students').select('id').eq('user_id', r.user_id).maybeSingle();
        if (!st) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
        const { error } = await a.from('student_enrolments').insert({ student_id: st.id, plan_id: r.plan_id, linked_via: 'admin', linked_by: who });
        if (error) return NextResponse.json({ error: 'That payment already belongs to another student.' }, { status: 409 });
      }
      await a.from('claim_reviews').update({ status: b.decision, reviewed_by: who, reviewed_at: new Date().toISOString() }).eq('id', r.id);
      return done(`claim_${b.decision}`, r.id);
    }
    case 'cert_issue': {
      if (!uuid(b.planId) || typeof b.courseSlug !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const r = await issueCertificateIfEligible(b.planId, b.courseSlug, who);
      return NextResponse.json({ ok: r.status === 'issued', result: r });
    }
    case 'cert_revoke': {
      if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const reason = cleanText(b.reason, 300);
      if (!reason) return NextResponse.json({ error: 'Give a reason.' }, { status: 400 });
      await a.from('certificates').update({ revoked: true, revoked_at: new Date().toISOString(), revoked_reason: reason }).eq('id', b.id);
      return done('certificate_revoked', b.id, { reason });
    }
    case 'cert_reissue': {
      // Correct a certificate: revoke the old one, then issue a fresh one from the student's current certificate name.
      if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const { data: c } = await a.from('certificates').select('id, plan_id, course_slug, revoked').eq('id', b.id).maybeSingle();
      if (!c?.plan_id || !c.course_slug || c.revoked) return NextResponse.json({ error: 'Cannot reissue this one' }, { status: 409 });
      await a.from('certificates').update({ revoked: true, revoked_at: new Date().toISOString(), revoked_reason: 'Reissued with corrected details' }).eq('id', c.id);
      const r = await issueCertificateIfEligible(c.plan_id, c.course_slug, who);
      if (r.status === 'issued') await a.from('certificates').update({ reissue_of: c.id }).eq('certificate_id', r.certificateId);
      else await a.from('certificates').update({ revoked: false, revoked_at: null, revoked_reason: null }).eq('id', c.id); // could not reissue: put the original back
      return done('certificate_reissued', c.id, { result: r.status });
    }
    case 'testimonial_approve': {
      if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      const r = await approveTestimonial(b.id, who);
      return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 409 });
    }
    case 'testimonial_changes': {
      const fb = cleanText(b.feedback, 1000);
      if (!uuid(b.id) || !fb) return NextResponse.json({ error: 'Say what to change.' }, { status: 400 });
      await unpublishTestimonial(b.id, who, 'changes_requested', fb);
      return NextResponse.json({ ok: true });
    }
    case 'testimonial_remove': {
      if (!uuid(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      await unpublishTestimonial(b.id, who, 'withdrawn');
      return NextResponse.json({ ok: true });
    }
    default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
