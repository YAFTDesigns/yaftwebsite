import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, isEmailConfigured, escapeHtml } from '@/lib/email';
import { CONTACT_EMAIL } from '@/lib/contact';
import { audit } from './audit';
import { claimExpiry, claimVerdict, hashClaimToken, hashEmail, newClaimToken, isWellFormedToken } from './claimToken';

export const SITE_ORIGIN = 'https://www.yaftdesigns.com';
const PLAN_TOKEN_RE = /^[A-Za-z0-9_-]{20,80}$/;

export type Candidate = { planId: string; title: string; createdAt: string };

/** Plans whose billing email equals the student's VERIFIED email and that nobody owns yet. Shown for explicit confirmation. */
export async function emailCandidates(email: string): Promise<Candidate[]> {
  const admin = getSupabaseAdmin();
  const { data: plans } = await admin.from('course_payment_plans').select('id, description, created_at').ilike('client_email', email.replace(/[%_\\]/g, '\\$&')).neq('status', 'cancelled');
  if (!plans?.length) return [];
  const { data: linked } = await admin.from('student_enrolments').select('plan_id').in('plan_id', plans.map((p) => p.id));
  const taken = new Set((linked ?? []).map((l) => l.plan_id as string));
  return plans.filter((p) => !taken.has(p.id)).map((p) => ({ planId: p.id, title: p.description, createdAt: p.created_at }));
}

/** Student confirms linking plans that match their verified email. Each plan is re-checked here; nothing is trusted from the browser. */
export async function linkByEmail(student: { id: string; userId: string; email: string }, planIds: string[]): Promise<{ linked: number; needsReview: number }> {
  const admin = getSupabaseAdmin();
  const allowed = new Set((await emailCandidates(student.email)).map((c) => c.planId));
  let linked = 0, needsReview = 0;
  for (const planId of [...new Set(planIds)].slice(0, 20)) {
    if (!allowed.has(planId)) { needsReview++; await admin.from('claim_reviews').insert({ user_id: student.userId, plan_id: null, note: 'Tried to link a plan that did not match the verified email or is already linked' }); continue; }
    const { error } = await admin.from('student_enrolments').insert({ student_id: student.id, plan_id: planId, linked_via: 'claim_link' });
    if (error) { needsReview++; await admin.from('claim_reviews').insert({ user_id: student.userId, plan_id: planId, note: 'Plan was claimed by someone else at the same moment' }); continue; }
    linked++;
    await audit({ actor_type: 'student', actor_ref: student.id, action: 'enrolment_linked_by_verified_email', subject: planId });
  }
  return { linked, needsReview };
}

/** Extract the pay-link token from a pasted /pay/<token> link or a bare token. Returns null if it does not look like one. */
export function planTokenFrom(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  const m = s.match(/\/pay\/([A-Za-z0-9_-]{20,80})/);
  const t = m ? m[1] : s;
  return PLAN_TOKEN_RE.test(t) ? t : null;
}

/**
 * Student asks to link an enrolment made under ANOTHER email. We email a single-use claim link to the billing address on that
 * plan (the verified channel). The caller always answers with the same generic message, so this never reveals whether a plan exists.
 */
export async function requestClaimLink(student: { id: string }, payToken: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: plan } = await admin.from('course_payment_plans').select('id, description, client_email, client_name, status').eq('token', payToken).maybeSingle();
  if (!plan || plan.status === 'cancelled') return;
  const { data: taken } = await admin.from('student_enrolments').select('id').eq('plan_id', plan.id).maybeSingle();
  if (taken) return;
  // keep at most 3 live claims per plan
  const { count } = await admin.from('enrolment_claims').select('id', { count: 'exact', head: true }).eq('plan_id', plan.id).is('used_at', null).gt('expires_at', new Date().toISOString());
  if ((count ?? 0) >= 3) return;
  const token = newClaimToken();
  const { error } = await admin.from('enrolment_claims').insert({ plan_id: plan.id, token_hash: hashClaimToken(token), expires_at: claimExpiry().toISOString(), sent_to_hash: hashEmail(plan.client_email) });
  if (error) return;
  await audit({ actor_type: 'student', actor_ref: student.id, action: 'claim_link_requested', subject: plan.id });
  // Real email only from production. Previews share the live database, so they never email real people.
  if (process.env.VERCEL_ENV !== 'production' || !isEmailConfigured()) return;
  const link = `${SITE_ORIGIN}/student?claim=${token}`;
  try {
    await sendEmail({
      to: plan.client_email,
      subject: 'Confirm: link your course enrolment to your student account',
      html: `<p>Hello ${escapeHtml(plan.client_name || '')},</p><p>Someone signed in to the YAFT Designs student portal and asked to link <strong>${escapeHtml(plan.description)}</strong> to their account.</p><p>If that was you, open this link while signed in to your student account. It works once and expires in 72 hours:</p><p><a href="${link}">${link}</a></p><p>If it was not you, ignore this email and nothing will be linked. Questions: ${escapeHtml(CONTACT_EMAIL)}</p>`,
    });
  } catch (e) { console.error('[claim] email failed:', e); }
}

export type RedeemResult = 'linked' | 'invalid';

/** Redeem the emailed claim link. Same generic outcome for unknown, used, expired, locked or already-owned. */
export async function redeemClaim(student: { id: string; userId: string }, token: unknown): Promise<RedeemResult> {
  if (!isWellFormedToken(token)) return 'invalid';
  const admin = getSupabaseAdmin();
  const { data: claim } = await admin.from('enrolment_claims').select('id, plan_id, expires_at, used_at, failed_attempts').eq('token_hash', hashClaimToken(token)).maybeSingle();
  if (!claim) return 'invalid';
  if (claimVerdict(claim) !== 'ok') { await admin.from('enrolment_claims').update({ failed_attempts: claim.failed_attempts + 1 }).eq('id', claim.id); return 'invalid'; }
  // claim the token first (single use), then link
  const { data: used } = await admin.from('enrolment_claims').update({ used_at: new Date().toISOString(), used_by_user_id: student.userId }).eq('id', claim.id).is('used_at', null).select('id');
  if (!used?.length) return 'invalid';
  const { error } = await admin.from('student_enrolments').insert({ student_id: student.id, plan_id: claim.plan_id, linked_via: 'claim_link' });
  if (error) { await admin.from('claim_reviews').insert({ user_id: student.userId, plan_id: claim.plan_id, note: 'Claim link used but the plan already belongs to another student' }); return 'invalid'; }
  await audit({ actor_type: 'student', actor_ref: student.id, action: 'enrolment_linked_by_claim_link', subject: claim.plan_id });
  return 'linked';
}
