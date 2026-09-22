import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB, same limit as workshop photo uploads
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VALID_KEYS = ['parametric-facade', 'shop-drawing', 'college-workshops', 'corporate-training'];

// POST /api/admin/services/[key]/image
// multipart/form-data: file (required), caption (optional)
// Same upload mechanics as the existing workshop-photo route (site-
// images bucket, same size/type limits), adapted for one image per
// service rather than a growing array -- each upload replaces
// whatever was there before, matching how a single hero-image slot
// is actually used on the page.
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { key } = await params;
  if (!VALID_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Unknown service key' }, { status: 400 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = form.get('file');
  const caption = String(form.get('caption') ?? '').trim() || null;

  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, or WEBP images are allowed' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image is too large (8MB max)' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${key}-${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from('site-images')
    .upload(`services/${filename}`, buffer, { contentType: file.type, upsert: false });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  // No leading "/" -- the public services page treats this as a
  // site-images Storage object (via getSiteImageUrl), distinct from
  // the seeded /public paths, which start with "/" and are served
  // directly. Both forms render correctly; this is simply what a
  // real upload through this route always produces going forward.
  const imagePath = `services/${filename}`;

  const { data: row, error: updateErr } = await supabase
    .from('service_images')
    .upsert({ service_key: key, image_path: imagePath, caption, updated_at: new Date().toISOString() }, { onConflict: 'service_key' })
    .select('*')
    .single();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ serviceImage: row });
}
