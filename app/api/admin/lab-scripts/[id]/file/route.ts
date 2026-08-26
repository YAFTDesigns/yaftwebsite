import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const MAX_BYTES = 15 * 1024 * 1024; // 15MB -- generous for a .gh/.3dm file

// POST /api/admin/lab-scripts/[id]/file
// multipart/form-data: file (required)
// Uploads to the dedicated lab-files bucket, stores the storage path
// on the script row. Any existing file for this script is simply
// overwritten (upsert) rather than accumulated, since a script has
// exactly one current file at a time.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is too large (15MB max)' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: script, error: fetchErr } = await supabase.from('lab_scripts').select('id').eq('id', id).single();
  if (fetchErr || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

  // Original filename preserved (sanitized) so the download keeps a
  // sensible extension and name -- these are .gh/.3dm files, unlike
  // images there's no fixed set of extensions to branch on.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${id}/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from('lab-files')
    .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: row, error: updateErr } = await supabase
    .from('lab_scripts').update({ file_path: path }).eq('id', id).select('*').single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ script: row });
}
