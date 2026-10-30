import { NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/student/session';
import { loadPortalView } from '@/lib/student/loadView';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: NO_STORE });
  const view = await loadPortalView({ id: s.profile.id, email: s.email });
  return NextResponse.json({
    profile: { displayName: s.profile.display_name, certificateName: s.profile.certificate_name, phone: s.profile.phone, email: s.email, googleAvatar: s.googleAvatar },
    ...view,
  }, { headers: NO_STORE });
}
