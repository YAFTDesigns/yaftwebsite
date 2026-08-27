import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB, matches the workshop-photo upload limit
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/admin/lab-scripts/[id]/thumbnail
// multipart/form-data: file (required)
// Uploads to the existing site-images bucket (thumbnails are images,
// same bucket workshop photos already use), under labs/. Overwrites
// any existing thumbnail for this script.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, or WEBP images are allowed' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is too large (8MB max)' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: script, error: fetchErr } = await supabase.from('lab_scripts').select('id').eq('id', id).single();
  if (fetchErr || !script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `labs/${id}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from('site-images')
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: row, error: updateErr } = await supabase
    .from('lab_scripts').update({ thumbnail_path: path, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ script: row });
}
