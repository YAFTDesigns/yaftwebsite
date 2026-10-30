import { getSupabaseAdmin } from '@/lib/supabase/admin';

/** A public LinkedIn profile address: https://(www.)linkedin.com/in/<handle>. Anything else is refused. Typing it is NOT proof of ownership. */
export function linkedinProfileUrl(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 200) return null;
  let u: URL;
  try { u = new URL(input.trim().startsWith('http') ? input.trim() : `https://${input.trim()}`); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  if (!['linkedin.com', 'www.linkedin.com', 'in.linkedin.com'].includes(u.hostname.toLowerCase())) return null;
  const m = u.pathname.match(/^\/in\/([A-Za-z0-9\-_%]{3,100})\/?$/);
  return m ? `https://www.linkedin.com/in/${m[1]}` : null;
}

/** Does this auth identity list contain a LinkedIn sign-in? That is the proof that the person controls that LinkedIn account. */
export const hasLinkedinIdentity = (identities: { provider?: string }[] | null | undefined) => (identities ?? []).some((i) => i.provider === 'linkedin_oidc');

/**
 * The public "Verified student" shield. All three must be true: LinkedIn connected by sign-in, at least one PAID enrolment,
 * and the student's latest choice is to show it. Used when publishing testimonials/projects and by a future forum.
 */
export async function verifiedBadgeFor(studentId: string): Promise<{ verified: boolean; linkedinUrl: string | null }> {
  const a = getSupabaseAdmin();
  const { data: st } = await a.from('students').select('linkedin_url, linkedin_verified_at').eq('id', studentId).maybeSingle();
  if (!st?.linkedin_verified_at) return { verified: false, linkedinUrl: null };
  const { data: consent } = await a.from('student_consents').select('granted').eq('student_id', studentId).eq('purpose', 'public_verified_badge').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (consent?.granted !== true) return { verified: false, linkedinUrl: null };
  const { data: links } = await a.from('student_enrolments').select('plan_id').eq('student_id', studentId);
  const ids = (links ?? []).map((l) => l.plan_id as string);
  if (!ids.length) return { verified: false, linkedinUrl: null };
  const { count } = await a.from('course_payments').select('id', { count: 'exact', head: true }).in('plan_id', ids).eq('status', 'paid');
  return (count ?? 0) > 0 ? { verified: true, linkedinUrl: st.linkedin_url ?? null } : { verified: false, linkedinUrl: null };
}
