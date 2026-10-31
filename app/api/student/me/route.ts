import { NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { loadPortalView } from '@/lib/student/loadView';
import { verifiedBadgeFor } from '@/lib/student/verified';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: NO_STORE });
  const [view, { data: c }, badge] = await Promise.all([
    loadPortalView({ id: s.profile.id, email: s.email }),
    getSupabaseAdmin().from('student_consents').select('granted').eq('student_id', s.profile.id).eq('purpose', 'public_verified_badge').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    verifiedBadgeFor(s.profile.id),
  ]);
  return NextResponse.json({
    profile: { displayName: s.profile.display_name, certificateName: s.profile.certificate_name, phone: s.profile.phone, email: s.email, googleAvatar: s.googleAvatar, linkedinUrl: s.profile.linkedin_url, linkedinConnected: s.linkedinConnected, linkedinEnabled: process.env.LINKEDIN_LOGIN_ENABLED === '1', badgeConsent: c?.granted === true, verified: badge.verified },
    ...view,
  }, { headers: NO_STORE });
}
