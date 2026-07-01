import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/testimonials — public, returns approved testimonials only
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('testimonials')
    .select('name, role, institution, quote, linkedin_url, instagram_url, show_social, photo_url, rating')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
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

  const supabase = getSupabaseAdmin();
  let photo_url: string | null = null;

  const photoFile = formData.get('photo') as File | null;
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo must be under 2MB.' }, { status: 400 });
    }
    const ext = photoFile.name.split('.').pop() ?? 'jpg';
    const storagePath = `testimonials/${Date.now()}.${ext}`;
    const bytes = await photoFile.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from('public-assets')
      .upload(storagePath, Buffer.from(bytes), { contentType: photoFile.type, cacheControl: '3600', upsert: false });
    if (!uploadErr) {
      photo_url = supabase.storage.from('public-assets').getPublicUrl(storagePath).data.publicUrl;
    }
  }

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
    status: 'pending',
  }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
