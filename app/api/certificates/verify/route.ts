import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';

// GET /api/certificates/verify?id=YAFT202607-05
// Public, deliberately outside /api/admin -- this is meant to be
// callable by anyone who has a certificate ID (the student, or anyone
// they show it to, e.g. an employer). There is no listing/search
// endpoint, only exact-ID lookup, so this can't be used to browse
// students.
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;

  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Missing certificate id' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('certificates')
    .select('certificate_id, student_name, course_key, course_suffix, duration_hours, issue_date, revoked')
    .eq('certificate_id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.revoked) {
    return NextResponse.json({ verified: false }, { status: 404 });
  }

  return NextResponse.json({ verified: true, data });
}
