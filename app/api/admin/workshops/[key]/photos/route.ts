import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per photo
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/admin/workshops/[key]/photos
// multipart/form-data: file (required), caption (required)
// Uploads to the site-images bucket under workshops/, then appends
// { filename, caption } to that workshop row's photos jsonb array --
// same shape the public /services page already expects.
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key } = await params;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = form.get('file');
  const caption = String(form.get('caption') ?? '').trim();

  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!caption) return NextResponse.json({ error: 'caption is required' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, or WEBP images are allowed' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is too large (8MB max)' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: workshop, error: fetchErr } = await supabase.from('workshops').select('photos').eq('key', key).single();
  if (fetchErr || !workshop) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });

  const existingPhotos: { filename: string; caption: string }[] = workshop.photos ?? [];
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${key}-${existingPhotos.length + 1}-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from('site-images')
    .upload(`workshops/${filename}`, buffer, { contentType: file.type, upsert: false });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const updatedPhotos = [...existingPhotos, { filename, caption }];
  const { data: row, error: updateErr } = await supabase
    .from('workshops')
    .update({ photos: updatedPhotos })
    .eq('key', key)
    .select('*')
    .single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ workshop: row, filename });
}

// DELETE /api/admin/workshops/[key]/photos?filename=xyz.jpg
// Removes one photo from the array (storage object left in place --
// harmless orphan, avoids a second failure mode if the delete races
// with something else reading the array).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key } = await params;
  const filename = request.nextUrl.searchParams.get('filename');
  if (!filename) return NextResponse.json({ error: 'filename query param is required' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: workshop, error: fetchErr } = await supabase.from('workshops').select('photos').eq('key', key).single();
  if (fetchErr || !workshop) return NextResponse.json({ error: 'Workshop not found' }, { status: 404 });

  const existingPhotos: { filename: string; caption: string }[] = workshop.photos ?? [];
  const updatedPhotos = existingPhotos.filter((p) => p.filename !== filename);

  const { data: row, error: updateErr } = await supabase
    .from('workshops')
    .update({ photos: updatedPhotos })
    .eq('key', key)
    .select('*')
    .single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ workshop: row });
}
