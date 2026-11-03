import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type WantedPlan = { courseSlugs: string[]; baseTotal: number; advanceBase: number | null; structure: 'instalments' | 'full'; currency: 'INR' | 'USD'; isTest: boolean };
export type CandidatePlan = { id: string; status: string; source: string | null; is_test: boolean; currency: string; structure: string; base_total: number; advance_base: number | null; course_slugs: string[] | null; created_at: string };

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/**
 * A student who starts checkout again for the same thing (closed the payment window, a card failed) should get their
 * open plan back instead of a second copy. Only an active website plan with nothing paid, the same courses and the same
 * fee, qualifies. Newest first.
 */
export function pickReusablePlan<T extends CandidatePlan>(plans: T[], paidPlanIds: ReadonlySet<string>, w: WantedPlan): T | null {
  return [...plans]
    .sort((x, y) => y.created_at.localeCompare(x.created_at))
    .find((p) => p.status === 'active' && p.source === 'enroll' && !paidPlanIds.has(p.id) && Boolean(p.is_test) === w.isTest && p.currency === w.currency
      && p.structure === w.structure && Number(p.base_total) === w.baseTotal && (p.advance_base ?? null) === w.advanceBase && sameSet(p.course_slugs ?? [], w.courseSlugs)) ?? null;
}

export async function findReusablePlan(studentId: string, w: WantedPlan) {
  const a = getSupabaseAdmin();
  const { data: links } = await a.from('student_enrolments').select('plan_id').eq('student_id', studentId);
  const ids = (links ?? []).map((l) => l.plan_id as string);
  if (!ids.length) return null;
  const { data: plans } = await a.from('course_payment_plans').select('*').in('id', ids).eq('status', 'active');
  if (!plans?.length) return null;
  const { data: paid } = await a.from('course_payments').select('plan_id').in('plan_id', plans.map((p) => p.id)).eq('status', 'paid');
  return pickReusablePlan(plans as (CandidatePlan & Record<string, unknown>)[], new Set((paid ?? []).map((r) => r.plan_id as string)), w);
}
