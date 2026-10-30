import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';

// Short-lived (60 s) link to the student's OWN uploaded file. The path must sit under their own folder.
export async function GET(req: NextRequest) {
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const path = new URL(req.url).searchParams.get('path') ?? '';
  if (!path.startsWith(`${s.profile.id}/`) || path.includes('..') || path.length > 200) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data } = await getSupabaseAdmin().storage.from('student-private').createSignedUrl(path, 60);
  if (!data?.signedUrl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { 'Cache-Control': 'private, no-store' } });
}
