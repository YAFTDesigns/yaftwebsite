import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

// POST /api/community/publications — public submission
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { author_name, author_role, title, description, pub_year } = body;
  if (!author_name?.trim() || !title?.trim() || !description?.trim() || !pub_year) {
    return NextResponse.json(
      { error: 'Author name, title, description and year are required.' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('publications').insert([{
    author_name: author_name.trim(),
    author_role: author_role?.trim() || null,
    title: title.trim(),
    magazine: body.magazine?.trim() || null,
    pub_month: body.pub_month?.trim() || null,
    pub_year: parseInt(pub_year),
    description: description.trim(),
    article_url: body.article_url?.trim() || null,
    status: 'pending',
  }]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
