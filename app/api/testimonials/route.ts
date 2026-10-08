import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { cleanImageUpload } from '@/lib/imageUpload';

// GET /api/testimonials — public, returns approved testimonials only
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('testimonials')
    .select('name, role, institution, quote, linkedin_url, instagram_url, show_social, photo_url, rating')
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('reviewed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[testimonials] read failed:', error);
    return NextResponse.json({ error: 'Could not load testimonials.' }, { status: 500 });
  }
  // Only expose social links when the author opted in.
  const rows = (data ?? []).map((t) => (t.show_social ? t : { ...t, linkedin_url: null, instagram_url: null }));
  return NextResponse.json({ data: rows });
}

// POST /api/testimonials — public submission, status = 'pending'
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const role = (formData.get('role') as string | null)?.trim();
  const quote = (formData.get('quote') as string | null)?.trim();
  if (!role || !quote) return NextResponse.json({ error: 'Role and testimonial are required.' }, { status: 400 });

  const photoFile = formData.get('photo') as File | null;
  if (!photoFile || photoFile.size === 0) {
    return NextResponse.json({ error: 'A profile photo is required.' }, { status: 400 });
  }
  if (photoFile.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo must be under 2MB.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let photo_url: string | null = null;

  const clean = await cleanImageUpload(photoFile, 800);
  if (!clean) return NextResponse.json({ error: 'Please upload a JPG, PNG or WebP photo.' }, { status: 400 });
  const storagePath = `testimonials/${Date.now()}-${Math.random().toString(36).slice(2)}.${clean.ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('public-assets')
    .upload(storagePath, clean.buffer, { contentType: clean.contentType, cacheControl: '3600', upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: 'Failed to upload photo. Please try again.' }, { status: 500 });
  }
  photo_url = supabase.storage.from('public-assets').getPublicUrl(storagePath).data.publicUrl;

  const { error } = await supabase.from('testimonials').insert([{
    name: (formData.get('name') as string | null)?.trim() || 'Anonymous',
    role,
    institution: (formData.get('institution') as string | null)?.trim() || null,
    course_taken: (formData.get('course_taken') as string | null)?.trim() || null,
    quote,
    linkedin_url: (formData.get('linkedin_url') as string | null)?.trim() || null,
    instagram_url: (formData.get('instagram_url') as string | null)?.trim() || null,
    show_social: formData.get('show_social') === 'true',
    photo_url,
    rating: parseFloat(formData.get('rating') as string) || 5.0,
    source: (formData.get('source') as string | null)?.trim() || null,
    status: 'pending',
  }]);

  if (error) {
    console.error('[testimonials] insert failed:', error);
    return NextResponse.json({ error: 'Could not save your testimonial. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
