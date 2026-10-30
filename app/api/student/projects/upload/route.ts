import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { ownsPlan } from '@/lib/student/projects';
import { editMode, type RevisionStatus } from '@/lib/student/projectInput';
import { MAX_PRIVATE_FILE_BYTES, safeFileName, sniffPrivateFile } from '@/lib/student/safe';
import { cleanImageUpload } from '@/lib/imageUpload';
import { rateLimitShared } from '@/lib/rateLimitShared';

const BUCKET = 'student-private';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Cover and gallery images are re-encoded (real format check, metadata stripped). Supporting files are PDF/ZIP/3DM only, checked by content.
// Everything lands in a PRIVATE bucket under this student's own folder; nothing becomes public from here.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const limited = await rateLimitShared(req, 'student-upload', { limit: 30, windowMs: 60 * 60_000 });
  if (limited) return limited;
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const planId = String(form?.get('planId') ?? ''), courseSlug = String(form?.get('courseSlug') ?? ''), kind = String(form?.get('kind') ?? '');
  if (!(file instanceof File) || !['cover', 'gallery', 'private'].includes(kind)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (!(await ownsPlan(s.profile.id, planId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const admin = getSupabaseAdmin();
  const { data: project } = await admin.from('student_projects').select('id').eq('plan_id', planId).eq('course_slug', courseSlug).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Save your project details first.' }, { status: 400 });
  const { data: rev } = await admin.from('project_revisions').select('id, status, cover_path, gallery_paths, private_files').eq('project_id', project.id).order('rev_no', { ascending: false }).limit(1).maybeSingle();
  if (!rev || editMode(rev.status as RevisionStatus) !== 'edit_in_place') return NextResponse.json({ error: 'Save as a draft first, or wait until the review is finished.' }, { status: 409 });

  const folder = `${s.profile.id}/${project.id}`;
  let path: string, bytes: Buffer, contentType: string, name = safeFileName(file.name);
  if (kind === 'private') {
    if (file.size > MAX_PRIVATE_FILE_BYTES) return NextResponse.json({ error: 'File is larger than 25 MB.' }, { status: 413 });
    if ((rev.private_files ?? []).length >= 5) return NextResponse.json({ error: 'Up to 5 supporting files.' }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const kindOf = sniffPrivateFile(buf);
    if (!kindOf) return NextResponse.json({ error: 'Only PDF, ZIP or Rhino (.3dm) files are accepted.' }, { status: 415 });
    bytes = buf; contentType = kindOf.mime; path = `${folder}/private/${randomUUID()}.${kindOf.ext}`;
    name = name.replace(/\.[^.]*$/, '') + '.' + kindOf.ext;
  } else {
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image is larger than 10 MB.' }, { status: 413 });
    if (kind === 'gallery' && (rev.gallery_paths ?? []).length >= 8) return NextResponse.json({ error: 'Up to 8 gallery images.' }, { status: 400 });
    const img = await cleanImageUpload(file);
    if (!img) return NextResponse.json({ error: 'That is not a usable image (JPG, PNG, WebP or GIF).' }, { status: 415 });
    bytes = img.buffer; contentType = img.contentType; path = `${folder}/${kind}/${randomUUID()}.webp`;
  }
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) { console.error('[student-upload]', error.message); return NextResponse.json({ error: 'Upload failed' }, { status: 500 }); }
  const patch = kind === 'cover' ? { cover_path: path } : kind === 'gallery' ? { gallery_paths: [...(rev.gallery_paths ?? []), path] } : { private_files: [...(rev.private_files ?? []), { path, name, size: bytes.length }] };
  await admin.from('project_revisions').update(patch).eq('id', rev.id);
  return NextResponse.json({ ok: true });
}
