import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { sameOrigin } from '@/lib/student/csrf';
import { cleanName } from '@/lib/student/safe';
import { audit } from '@/lib/student/audit';
import { linkedinProfileUrl } from '@/lib/student/verified';

export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Bad origin' }, { status: 403 });
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('displayName' in b) patch.display_name = cleanName(b.displayName) || null;
  if ('certificateName' in b) patch.certificate_name = cleanName(b.certificateName) || null;
  if ('phone' in b) {
    const ph = typeof b.phone === 'string' ? b.phone.replace(/[^\d+ ]/g, '').trim().slice(0, 20) : '';
    patch.phone = ph || null;
  }
  if ('linkedinUrl' in b) {
    const raw = typeof b.linkedinUrl === 'string' ? b.linkedinUrl.trim() : '';
    if (raw) { const li = linkedinProfileUrl(raw); if (!li) return NextResponse.json({ error: 'Use your LinkedIn profile address, like linkedin.com/in/yourname' }, { status: 400 }); patch.linkedin_url = li; }
    else patch.linkedin_url = null;
  }
  const { error } = await getSupabaseAdmin().from('students').update(patch).eq('id', s.profile.id);
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  await audit({ actor_type: 'student', actor_ref: s.profile.id, action: 'profile_updated', detail: { fields: Object.keys(patch).filter((k) => k !== 'updated_at') } });
  return NextResponse.json({ ok: true });
}
