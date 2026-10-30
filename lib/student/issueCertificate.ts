import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { buildEnrolmentCard, type PlanRow } from './enrolmentView';
import { certificateEligibility } from './certificateEligibility';
import { audit } from './audit';
import type { PlanKind } from '@/lib/coursePayments';

export type IssueResult =
  | { status: 'issued'; certificateId: string }
  | { status: 'not_eligible'; missing: string[] }
  | { status: 'needs_setup'; missing: string[] };

async function nextCertificateId(): Promise<string> {
  const now = new Date();
  const prefix = `YAFT${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const { data } = await getSupabaseAdmin().from('certificates').select('certificate_id').like('certificate_id', `${prefix}%`).order('certificate_id', { ascending: false }).limit(50);
  const max = (data ?? []).reduce((m, r) => Math.max(m, parseInt(String(r.certificate_id).split('-')[1], 10) || 0), 0);
  return `${prefix}${max + 1}`;
}

/**
 * Issue the certificate for one enrolment + course IF every rule is met. Safe to call repeatedly: the unique index
 * certificates_one_live_per_enrolment guarantees no duplicate, and a lost race is treated as "already issued".
 * Uses the existing certificates table and numbering, so the existing PDF and public code check keep working.
 */
export async function issueCertificateIfEligible(planId: string, courseSlug: string, issuedBy: string): Promise<IssueResult> {
  const admin = getSupabaseAdmin();
  const { data: link } = await admin.from('student_enrolments').select('student_id').eq('plan_id', planId).maybeSingle();
  if (!link) return { status: 'not_eligible', missing: ['Enrolment is not linked to a student'] };
  const [{ data: student }, { data: plan }, { data: pays }, { data: project }, { data: rule }, { data: live }, { data: course }] = await Promise.all([
    admin.from('students').select('display_name, certificate_name').eq('id', link.student_id).maybeSingle(),
    admin.from('course_payment_plans').select('id, status, description, course_slugs, currency, is_test, structure, base_total, advance_base').eq('id', planId).maybeSingle(),
    admin.from('course_payments').select('kind').eq('plan_id', planId).eq('status', 'paid'),
    admin.from('student_projects').select('id').eq('plan_id', planId).eq('course_slug', courseSlug).maybeSingle(),
    admin.from('course_rules').select('requires_full_payment, cert_key, cert_suffix, cert_hours').eq('course_slug', courseSlug).maybeSingle(),
    admin.from('certificates').select('id').eq('plan_id', planId).eq('course_slug', courseSlug).eq('revoked', false).maybeSingle(),
    admin.from('courses').select('title').eq('slug', courseSlug).maybeSingle(),
  ]);
  if (!plan || !student) return { status: 'not_eligible', missing: ['Enrolment not found'] };
  let approved = false;
  if (project) {
    const { count } = await admin.from('project_revisions').select('id', { count: 'exact', head: true }).eq('project_id', project.id).eq('status', 'approved');
    approved = (count ?? 0) > 0;
  }
  const card = buildEnrolmentCard(plan as unknown as PlanRow, (pays ?? []).map((p) => p.kind as PlanKind));
  const elig = certificateEligibility({ projectState: approved ? 'approved' : 'none', payStatus: card.payStatus, requiresFullPayment: rule?.requires_full_payment ?? true, hasLiveCertificate: !!live });
  if (!elig.eligible) return { status: 'not_eligible', missing: elig.missing };
  const setup: string[] = [];
  const printedName = student.certificate_name || student.display_name;
  if (!printedName) setup.push('Student has not set a certificate name');
  if (!rule?.cert_key || !rule.cert_suffix || !rule.cert_hours) setup.push('Certificate template details for this course (product, suffix, hours) are not set');
  if (setup.length) return { status: 'needs_setup', missing: setup };

  for (let attempt = 0; attempt < 3; attempt++) {
    const certificate_id = await nextCertificateId();
    const { error } = await admin.from('certificates').insert({
      certificate_id, student_name: printedName, course_key: rule!.cert_key, course_suffix: rule!.cert_suffix, duration_hours: rule!.cert_hours,
      issue_date: new Date().toISOString().slice(0, 10), student_id: link.student_id, plan_id: planId, project_id: project!.id,
      course_slug: courseSlug, course_title: course?.title ?? plan.description, completion_date: new Date().toISOString().slice(0, 10),
      verify_token: randomBytes(16).toString('base64url'), issued_by: issuedBy,
    });
    if (!error) { await audit({ actor_type: issuedBy === 'auto' ? 'system' : 'admin', actor_ref: issuedBy, action: 'certificate_issued', subject: certificate_id }); return { status: 'issued', certificateId: certificate_id }; }
    if (error.message.includes('certificates_one_live_per_enrolment')) return { status: 'not_eligible', missing: ['Already issued'] };
    // certificate_id collision from a concurrent issue: loop and take the next number
  }
  return { status: 'not_eligible', missing: ['Could not allocate a certificate number, try again'] };
}
