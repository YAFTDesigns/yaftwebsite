import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type FunnelInput = {
  students: { id: string; created_at: string }[];
  links: { student_id: string; plan_id: string }[];
  plans: { id: string; is_test: boolean }[];
  payments: { plan_id: string; kind: string; paid_at: string | null; test_mode: boolean }[];
};
export type RegFunnel = {
  registered: number; startedCheckout: number; paid: number; fullyPaid: number;
  months: { key: string; registered: number; buyers: number }[];
};

const monthKey = (iso: string) => new Date(new Date(iso).getTime() + 19800000).toISOString().slice(0, 7);

/** Pure: registered -> started a (real) payment plan -> paid something -> paid in full. Test plans and test payments never count. */
export function buildRegFunnel(d: FunnelInput, monthsBack = 6, now = new Date()): RegFunnel {
  const real = new Set(d.plans.filter((p) => !p.is_test).map((p) => p.id));
  const planOf = new Map<string, Set<string>>();
  for (const l of d.links) if (real.has(l.plan_id)) (planOf.get(l.student_id) ?? planOf.set(l.student_id, new Set()).get(l.student_id)!).add(l.plan_id);
  const payByPlan = new Map<string, FunnelInput['payments']>();
  for (const p of d.payments) if (!p.test_mode && p.paid_at && real.has(p.plan_id)) (payByPlan.get(p.plan_id) ?? payByPlan.set(p.plan_id, []).get(p.plan_id)!).push(p);

  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) { const t = new Date(now.getTime() + 19800000); t.setUTCDate(1); t.setUTCMonth(t.getUTCMonth() - i); keys.push(t.toISOString().slice(0, 7)); }
  const months = keys.map((key) => ({ key, registered: 0, buyers: 0 }));
  const out: RegFunnel = { registered: d.students.length, startedCheckout: 0, paid: 0, fullyPaid: 0, months };

  for (const s of d.students) {
    const m = months.find((x) => x.key === monthKey(s.created_at)); if (m) m.registered++;
    const plans = [...(planOf.get(s.id) ?? [])];
    if (!plans.length) continue;
    out.startedCheckout++;
    const pays = plans.flatMap((p) => payByPlan.get(p) ?? []);
    if (!pays.length) continue;
    out.paid++;
    if (pays.some((p) => p.kind === 'balance' || p.kind === 'full')) out.fullyPaid++;
    const first = pays.map((p) => p.paid_at!).sort()[0];
    const b = months.find((x) => x.key === monthKey(first)); if (b) b.buyers++;
  }
  return out;
}

export async function loadRegFunnel(): Promise<RegFunnel> {
  const a = getSupabaseAdmin();
  const [s, l, p, y] = await Promise.all([
    a.from('students').select('id, created_at').is('deleted_at', null).limit(10000),
    a.from('student_enrolments').select('student_id, plan_id').limit(10000),
    a.from('course_payment_plans').select('id, is_test').limit(10000),
    a.from('course_payments').select('plan_id, kind, paid_at, test_mode').eq('status', 'paid').limit(10000),
  ]);
  return buildRegFunnel({ students: s.data ?? [], links: l.data ?? [], plans: p.data ?? [], payments: y.data ?? [] } as FunnelInput);
}
