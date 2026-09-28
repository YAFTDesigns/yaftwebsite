import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/admin/courses/[slug]/image  (multipart: file)
// Same site-images bucket and limits as workshop/service uploads. Stores
// a bucket-relative path, which is exactly what lib/courses.ts already
// feeds through getSiteImageUrl for the /courses grid.
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, or WEBP images are allowed' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is too large (8MB max)' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from('courses').select('slug').eq('slug', slug).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Unknown course' }, { status: 404 });

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectPath = `courses/${slug}-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('site-images')
    .upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from('courses').update({ image_path: objectPath, updated_at: new Date().toISOString() })
    .eq('slug', slug).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data });
}
