import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitShared } from '@/lib/rateLimitShared';

// Public check from a certificate's QR link. Reachable only with the unguessable token, rate limited, never cached.
// Public mode returns just: valid or revoked, name, course, date, certificate id. No email, no payment, no student id.
const H = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = await rateLimitShared(req, 'cert-verify-token', { limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return NextResponse.json({ valid: false }, { status: 404, headers: H });
  const { data: c } = await getSupabaseAdmin().from('certificates').select('certificate_id, student_name, course_title, course_suffix, completion_date, issue_date, revoked').eq('verify_token', token).maybeSingle();
  if (!c) return NextResponse.json({ valid: false }, { status: 404, headers: H });
  if (c.revoked) return NextResponse.json({ valid: false, revoked: true, certificateId: c.certificate_id }, { headers: H });
  return NextResponse.json({ valid: true, certificateId: c.certificate_id, name: c.student_name, course: c.course_title || c.course_suffix, date: c.completion_date || c.issue_date }, { headers: H });
}
