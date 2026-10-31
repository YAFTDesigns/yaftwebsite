import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { cleanName, safeHttpsLink } from './safe';
import { hasLinkedinIdentity } from './verified';

export type StudentProfile = { id: string; display_name: string | null; certificate_name: string | null; phone: string | null; avatar_path: string | null; linkedin_url: string | null; linkedin_verified_at: string | null; occupation: 'professional' | 'student' | null; designation: string | null; organisation: string | null; college: string | null; study_field: string | null };
export type StudentSession = { userId: string; email: string; profile: StudentProfile; googleAvatar: string | null; linkedinConnected: boolean };

const SEL = 'id, display_name, certificate_name, phone, avatar_path, linkedin_url, linkedin_verified_at, occupation, designation, organisation, college, study_field';

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
    // LinkedIn is "connected" only if the auth account really has a LinkedIn sign-in identity. Keep our record in step with it (also clears it if unlinked).
    const linkedinConnected = hasLinkedinIdentity(user.identities);
    if (linkedinConnected !== !!profile.linkedin_verified_at) {
      const at = linkedinConnected ? new Date().toISOString() : null;
      await admin.from('students').update({ linkedin_verified_at: at }).eq('id', profile.id);
      profile = { ...profile, linkedin_verified_at: at };
      // Linking LinkedIn is itself the consent to show the shield; unlinking withdraws it (the cleanup of public items is done by /api/student/badge).
      if (linkedinConnected) await admin.from('student_consents').insert({ student_id: profile.id, purpose: 'public_verified_badge', version: '2026-10-v1', granted: true });
    }
    return { userId: user.id, email: user.email.toLowerCase(), profile: profile as StudentProfile, googleAvatar, linkedinConnected };
  } catch (err) {
    console.error('[student-session] failed:', err);
    return null; // fail closed
  }
}
