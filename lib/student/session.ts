import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanName, safeHttpsLink } from './safe';

export type StudentProfile = { id: string; display_name: string | null; certificate_name: string | null; phone: string | null; avatar_path: string | null };
export type StudentSession = { userId: string; email: string; profile: StudentProfile; googleAvatar: string | null };

const SEL = 'id, display_name, certificate_name, phone, avatar_path';

/**
 * The ONLY way portal code learns who the student is: the verified Supabase session, read on the server.
 * An unverified email never gets a session here, and a browser-supplied user id is never trusted.
 * Creates the profile row on first visit (no enrolment is attached: that needs the claim flow).
 */
export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const { data: { user } } = await (await getSupabaseServer()).auth.getUser();
    if (!user?.email || !user.email_confirmed_at) return null;
    const admin = getSupabaseAdmin();
    let { data: profile } = await admin.from('students').select(SEL).eq('user_id', user.id).is('deleted_at', null).maybeSingle();
    if (!profile) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const display = cleanName(meta.full_name ?? meta.name ?? '') || null;
      await admin.from('students').upsert({ user_id: user.id, display_name: display }, { onConflict: 'user_id', ignoreDuplicates: true });
      ({ data: profile } = await admin.from('students').select(SEL).eq('user_id', user.id).is('deleted_at', null).maybeSingle());
    }
    if (!profile) return null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const pic = safeHttpsLink(meta.avatar_url ?? meta.picture);
    const googleAvatar = pic && new URL(pic).hostname.endsWith('googleusercontent.com') ? pic : null;
    return { userId: user.id, email: user.email.toLowerCase(), profile: profile as StudentProfile, googleAvatar };
  } catch (err) {
    console.error('[student-session] failed:', err);
    return null; // fail closed
  }
}
