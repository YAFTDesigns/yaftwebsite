import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { adminEmail } from '@/lib/admin/adminEmail';
import { cleanText } from '@/lib/student/safe';
import { issueCertificateIfEligible } from '@/lib/student/issueCertificate';
import { audit } from '@/lib/student/audit';
import { sameOrigin } from '@/lib/student/csrf';

// GET: submitted / under-review project revisions. POST { revisionId, decision: 'under_review'|'changes_requested'|'approved', feedback? }
export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('project_revisions').select('id, project_id, rev_no, status, title, description, links, cover_path, gallery_paths, private_files, submitted_at, feedback, student_projects!inner(plan_id, course_slug, publish_consent, public_display_name, student_id)').in('status', ['submitted', 'under_review']).order('submitted_at');
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = await adminEmail();
  const b = await req.json().catch(() => ({}));
  const decision = b.decision;
  if (!['under_review', 'changes_requested', 'approved'].includes(decision) || typeof b.revisionId !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const feedback = cleanText(b.feedback, 4000) || null;
  if (decision === 'changes_requested' && !feedback) return NextResponse.json({ error: 'Say what needs to change.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data: rev } = await admin.from('project_revisions').select('id, project_id, status, student_projects!inner(plan_id, course_slug, publish_consent)').eq('id', b.revisionId).maybeSingle();
  if (!rev || !['submitted', 'under_review'].includes(rev.status)) return NextResponse.json({ error: 'Not awaiting review' }, { status: 409 });
  const proj = rev.student_projects as unknown as { plan_id: string; course_slug: string; publish_consent: boolean };
  await admin.from('project_revisions').update({ status: decision, feedback, feedback_released: decision === 'changes_requested' || (decision === 'approved' && !!feedback), reviewed_by: email, reviewed_at: new Date().toISOString() }).eq('id', rev.id);
  await admin.from('student_projects').update({ status: decision, ...(decision === 'approved' && proj.publish_consent ? { published_revision_id: rev.id } : {}) }).eq('id', rev.project_id);
  await audit({ actor_type: 'admin', actor_ref: email, action: `project_${decision}`, subject: rev.project_id });
  let certificate: unknown = null;
  if (decision === 'approved') certificate = await issueCertificateIfEligible(proj.plan_id, proj.course_slug, 'auto');
  return NextResponse.json({ ok: true, certificate });
}
