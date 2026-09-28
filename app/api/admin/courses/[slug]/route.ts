import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// PATCH /api/admin/courses/[slug]
// Edits only the fields that genuinely exist on the courses table and
// feed the /courses grid cards. Slug is deliberately not editable: it
// is the key tying this row to a static detail page, the sitemap, the
// enquiry-form options and syllabus_requests (FK), so changing it
// would silently break all four.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const update: Record<string, unknown> = {};
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

  const title = text(body.title, 120);
  if (title !== undefined) {
    if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    update.title = title;
  }
  for (const [key, max] of [['tool', 60], ['level', 60], ['duration', 60], ['description', 600]] as const) {
    const v = text(body[key], max);
    if (v !== undefined) update[key] = v || null;
  }
  if (typeof body.active === 'boolean') update.active = body.active;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  update.updated_at = new Date().toISOString();

  const { data, error } = await getSupabaseAdmin()
    .from('courses').update(update).eq('slug', slug).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data });
}
