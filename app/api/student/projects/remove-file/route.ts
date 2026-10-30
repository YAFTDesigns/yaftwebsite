import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { ownsPlan } from '@/lib/student/projects';
import { editMode, type RevisionStatus } from '@/lib/student/projectInput';

// Remove one of the student's own files from their editable draft (cover, gallery image, private file, or profile photo).
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const path = typeof b.path === 'string' ? b.path : '';
  if (!path.startsWith(`${s.profile.id}/`) || path.includes('..') || typeof b.planId !== 'string' || typeof b.courseSlug !== 'string') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await ownsPlan(s.profile.id, b.planId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const a = getSupabaseAdmin();
  const { data: project } = await a.from('student_projects').select('id, profile_photo_path').eq('plan_id', b.planId).eq('course_slug', b.courseSlug).eq('student_id', s.profile.id).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (project.profile_photo_path === path) { await a.from('student_projects').update({ profile_photo_path: null }).eq('id', project.id); return NextResponse.json({ ok: true }); }
  const { data: rev } = await a.from('project_revisions').select('id, status, cover_path, gallery_paths, private_files').eq('project_id', project.id).order('rev_no', { ascending: false }).limit(1).maybeSingle();
  if (!rev || editMode(rev.status as RevisionStatus) !== 'edit_in_place') return NextResponse.json({ error: 'You can change files only while this is a draft.' }, { status: 409 });
  // Files belonging to an earlier approved version are copied by reference, so only drop the reference here; the stored object stays for that version.
  const patch: Record<string, unknown> = {};
  if (rev.cover_path === path) patch.cover_path = null;
  else if ((rev.gallery_paths ?? []).includes(path)) patch.gallery_paths = rev.gallery_paths.filter((x: string) => x !== path);
  else if ((rev.private_files ?? []).some((f: { path: string }) => f.path === path)) patch.private_files = rev.private_files.filter((f: { path: string }) => f.path !== path);
  else return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await a.from('project_revisions').update(patch).eq('id', rev.id);
  return NextResponse.json({ ok: true });
}
