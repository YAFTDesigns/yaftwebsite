import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

const IMG_MAX_BYTES = 2 * 1024 * 1024;

async function uploadToStorage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  file: File,
  folder: string,
): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from('site-images')
    .upload(`${folder}/${name}`, Buffer.from(bytes), { contentType: file.type, upsert: false });
  return error ? null : name;
}

// POST /api/community/student-work — public submission with optional image uploads
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const name = (formData.get('name') as string | null)?.trim();
  const project_title = (formData.get('project_title') as string | null)?.trim();
  const description = (formData.get('description') as string | null)?.trim();

  if (!name || !project_title || !description) {
    return NextResponse.json({ error: 'Name, project title, and description are required.' }, { status: 400 });
  }
  if (description.length > 300) {
    return NextResponse.json({ error: 'Description must be 300 characters or less.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let profile_photo_url: string | null = null;
  const profilePhoto = formData.get('profile_photo') as File | null;
  if (profilePhoto && profilePhoto.size > 0 && profilePhoto.size <= IMG_MAX_BYTES) {
    profile_photo_url = await uploadToStorage(supabase, profilePhoto, 'student-work/photos');
  }

  const project_image_urls: string[] = [];
  for (let i = 0; i < 3; i++) {
    const img = formData.get(`project_image_${i}`) as File | null;
    if (img && img.size > 0 && img.size <= IMG_MAX_BYTES) {
      const url = await uploadToStorage(supabase, img, 'student-work/images');
      if (url) project_image_urls.push(url);
    }
  }

  const { error } = await supabase.from('student_work').insert([{
    name,
    role: (formData.get('role') as string | null)?.trim() || '',
    project_title,
    tool: (formData.get('tool') as string | null) || 'rhino',
    category: (formData.get('category') as string | null)?.trim() || '',
    description,
    portfolio_url: (formData.get('portfolio_url') as string | null)?.trim() || null,
    status: 'pending',
    profile_photo_url,
    project_image_urls: project_image_urls.length ? project_image_urls : null,
  }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
