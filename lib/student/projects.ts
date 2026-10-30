import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { audit } from './audit';
import { cardMeta, editMode, validateRevisionInput, type RevisionStatus } from './projectInput';

export type RevisionView = {
  id: string; revNo: number; status: RevisionStatus; title: string; description: string | null; links: string[];
  coverPath: string | null; galleryPaths: string[]; privateFiles: { path: string; name: string; size: number }[];
  feedback: string | null; submittedAt: string | null;
};
export type ProjectView = {
  id: string; planId: string; courseSlug: string; status: RevisionStatus; publishConsent: boolean; publicDisplayName: string | null;
  published: boolean; latest: RevisionView | null; hasApproved: boolean;
  role: string | null; tool: string | null; category: string | null; hasProfilePhoto: boolean;
};

const REV_COLS = 'id, project_id, rev_no, status, title, description, links, cover_path, gallery_paths, private_files, feedback, feedback_released, submitted_at';

type RevRow = { id: string; project_id: string; rev_no: number; status: RevisionStatus; title: string; description: string | null; links: string[]; cover_path: string | null; gallery_paths: string[]; private_files: { path: string; name: string; size: number }[]; feedback: string | null; feedback_released: boolean; submitted_at: string | null };

const toView = (r: RevRow): RevisionView => ({
  id: r.id, revNo: r.rev_no, status: r.status, title: r.title, description: r.description, links: r.links ?? [],
  coverPath: r.cover_path, galleryPaths: r.gallery_paths ?? [], privateFiles: r.private_files ?? [],
  feedback: r.feedback_released ? r.feedback : null, submittedAt: r.submitted_at,
});

/** The student owns this plan (enrolment) and it is not cancelled. Every project action starts here. */
export async function ownsPlan(studentId: string, planId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('student_enrolments').select('plan_id, course_payment_plans!inner(status)').eq('student_id', studentId).eq('plan_id', planId).maybeSingle();
  const plan = data?.course_payment_plans as unknown as { status: string } | { status: string }[] | null | undefined;
  const status = Array.isArray(plan) ? plan[0]?.status : plan?.status;
  if (!data || status === 'cancelled') return false;
  const { count } = await admin.from('course_payments').select('id', { count: 'exact', head: true }).eq('plan_id', planId).eq('status', 'paid');
  return (count ?? 0) > 0; // a started-but-unpaid checkout is not an active enrolment
}

export async function loadProjects(studentId: string): Promise<ProjectView[]> {
  const admin = getSupabaseAdmin();
  const { data: projects } = await admin.from('student_projects').select('id, plan_id, course_slug, status, publish_consent, public_display_name, published_revision_id, public_role, tool, category, profile_photo_path').eq('student_id', studentId);
  if (!projects?.length) return [];
  const { data: revs } = await admin.from('project_revisions').select(REV_COLS).in('project_id', projects.map((p) => p.id)).order('rev_no', { ascending: false });
  return projects.map((p) => {
    const mine = ((revs ?? []) as RevRow[]).filter((r) => r.project_id === p.id);
    return {
      id: p.id, planId: p.plan_id, courseSlug: p.course_slug, status: p.status, publishConsent: p.publish_consent, publicDisplayName: p.public_display_name,
      published: !!p.published_revision_id, role: p.public_role, tool: p.tool, category: p.category, hasProfilePhoto: !!p.profile_photo_path, latest: mine[0] ? toView(mine[0]) : null, hasApproved: mine.some((r) => r.status === 'approved'),
    };
  });
}

async function getOrCreateProject(studentId: string, planId: string, courseSlug: string) {
  const admin = getSupabaseAdmin();
  const { data: found } = await admin.from('student_projects').select('id, status').eq('plan_id', planId).eq('course_slug', courseSlug).maybeSingle();
  if (found) return found;
  await admin.from('student_projects').upsert({ student_id: studentId, plan_id: planId, course_slug: courseSlug }, { onConflict: 'plan_id,course_slug', ignoreDuplicates: true });
  const { data } = await admin.from('student_projects').select('id, status').eq('plan_id', planId).eq('course_slug', courseSlug).maybeSingle();
  return data;
}

export type SaveResult = { ok: true; revisionId: string } | { ok: false; error: string; status: number };

/** Save the student's draft. Never edits an approved revision (a new one is created) and never edits work under review. */
export async function saveDraft(student: { id: string }, planId: string, courseSlug: string, raw: unknown): Promise<SaveResult> {
  if (!(await ownsPlan(student.id, planId))) return { ok: false, error: 'Not found', status: 404 };
  const admin = getSupabaseAdmin();
  const { data: plan } = await admin.from('course_payment_plans').select('course_slugs').eq('id', planId).maybeSingle();
  if (!plan?.course_slugs?.includes(courseSlug)) return { ok: false, error: 'Not found', status: 404 };
  const v = validateRevisionInput(raw);
  if (!v.ok) return { ok: false, error: v.error, status: 400 };
  const project = await getOrCreateProject(student.id, planId, courseSlug);
  if (!project) return { ok: false, error: 'Could not save', status: 500 };
  const meta = cardMeta(raw, courseSlug);
  await admin.from('student_projects').update({ public_role: meta.role, tool: meta.tool, category: meta.category || null }).eq('id', project.id);
  const { data: latest } = await admin.from('project_revisions').select('id, rev_no, status, cover_path, gallery_paths, private_files').eq('project_id', project.id).order('rev_no', { ascending: false }).limit(1).maybeSingle();
  const mode = editMode((latest?.status as RevisionStatus | undefined) ?? null);
  if (mode === 'locked') return { ok: false, error: 'This project is being reviewed and cannot be edited right now.', status: 409 };
  const fields = { title: v.value.title, description: v.value.description || null, links: v.value.links };
  if (mode === 'edit_in_place' && latest) {
    const { error } = await admin.from('project_revisions').update({ ...fields, status: 'draft' }).eq('id', latest.id);
    if (error) return { ok: false, error: 'Could not save', status: 500 };
    await admin.from('student_projects').update({ status: 'draft' }).eq('id', project.id);
    return { ok: true, revisionId: latest.id };
  }
  // new revision (first one, or an edit after approval). Assets carry over so nothing is lost; the approved copy stays untouched.
  const { data: ins, error } = await admin.from('project_revisions').insert({
    project_id: project.id, rev_no: (latest?.rev_no ?? 0) + 1, ...fields, status: 'draft',
    cover_path: latest?.cover_path ?? null, gallery_paths: latest?.gallery_paths ?? [], private_files: latest?.private_files ?? [],
  }).select('id').single();
  if (error || !ins) return { ok: false, error: 'Could not save', status: 500 };
  await admin.from('student_projects').update({ status: 'draft' }).eq('id', project.id);
  await audit({ actor_type: 'student', actor_ref: student.id, action: 'project_revision_created', subject: project.id });
  return { ok: true, revisionId: ins.id };
}

export async function submitProject(student: { id: string }, planId: string, courseSlug: string, consent: { publish: boolean; publicName: string | null }): Promise<SaveResult> {
  if (!(await ownsPlan(student.id, planId))) return { ok: false, error: 'Not found', status: 404 };
  const admin = getSupabaseAdmin();
  const { data: project } = await admin.from('student_projects').select('id').eq('plan_id', planId).eq('course_slug', courseSlug).maybeSingle();
  if (!project) return { ok: false, error: 'Save your draft first.', status: 400 };
  const { data: latest } = await admin.from('project_revisions').select('id, status, title').eq('project_id', project.id).order('rev_no', { ascending: false }).limit(1).maybeSingle();
  if (!latest || latest.status !== 'draft') return { ok: false, error: 'There is no draft to submit.', status: 409 };
  const now = new Date().toISOString();
  await admin.from('project_revisions').update({ status: 'submitted', submitted_at: now }).eq('id', latest.id);
  await admin.from('student_projects').update({ status: 'submitted', publish_consent: consent.publish, public_display_name: consent.publish ? consent.publicName : null }).eq('id', project.id);
  await admin.from('student_consents').insert({ student_id: student.id, purpose: 'project_publication', version: '2026-10-v1', granted: consent.publish, subject_id: project.id });
  await audit({ actor_type: 'student', actor_ref: student.id, action: 'project_submitted', subject: project.id });
  return { ok: true, revisionId: latest.id };
}
