import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

// Admin-only, 60-second link to a student's private file for review.
export async function GET(req: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const path = new URL(req.url).searchParams.get('path') ?? '';
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(cover|gallery|private|testimonials)\/[0-9a-f-]{36}\.\w{2,4}$|^[0-9a-f-]{36}\/testimonials\/[0-9a-f-]{36}\.\w{2,4}$/i.test(path)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getSupabaseAdmin().storage.from('student-private').createSignedUrl(path, 60);
  return data?.signedUrl ? NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
