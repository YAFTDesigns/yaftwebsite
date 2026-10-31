import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { scheduleFor, type PlanShape } from '@/lib/coursePayments';

export type LiveBill = {
  id: string; paidAt: string | null; student: string; email: string; phone: string | null; course: string; kind: string;
  amountInr: number; courseTotalInr: number; paidSoFarInr: number; balanceInr: number; invoiceNo: string | null; test: boolean; syncStatus: string;
};

type PlanRow = PlanShape & { id: string; client_name: string; client_email: string; client_phone: string | null; description: string; is_test: boolean };

/** The latest paid course instalments, newest first, each with what the student has paid in total and what is still left. Used by the admin Live bills tab and the payment alert. */
export async function loadLiveBills(limit = 40, onlyPaymentId?: string): Promise<LiveBill[]> {
  const a = getSupabaseAdmin();
  let q = a.from('course_payments').select('id, plan_id, kind, amount_minor, paid_at, invoice_no, test_mode, sync_status').eq('status', 'paid').order('paid_at', { ascending: false, nullsFirst: false }).limit(limit);
  if (onlyPaymentId) q = a.from('course_payments').select('id, plan_id, kind, amount_minor, paid_at, invoice_no, test_mode, sync_status').eq('id', onlyPaymentId).limit(1);
  const { data: raw } = await q;
  // Payments whose bill was deleted in admin (e.g. test payments) drop out of the live list.
  const nos = (raw ?? []).map((p) => p.invoice_no as string | null).filter(Boolean) as string[];
  const { data: gone } = nos.length ? await a.from('invoices').select('invoice_no').in('invoice_no', nos).not('deleted_at', 'is', null) : { data: [] as { invoice_no: string }[] };
  const goneSet = new Set((gone ?? []).map((g) => g.invoice_no));
  const pays = onlyPaymentId ? raw : (raw ?? []).filter((p) => !p.invoice_no || !goneSet.has(p.invoice_no as string));
  if (!pays?.length) return [];
  const planIds = [...new Set(pays.map((p) => p.plan_id as string))];
  const [{ data: plans }, { data: allPaid }] = await Promise.all([
    a.from('course_payment_plans').select('id, client_name, client_email, client_phone, description, structure, base_total, advance_base, is_test').in('id', planIds),
    a.from('course_payments').select('plan_id, amount_minor').in('plan_id', planIds).eq('status', 'paid'),
  ]);
  const byPlan = new Map((plans ?? []).map((p) => [p.id as string, p as unknown as PlanRow]));
  const paidSum = new Map<string, number>();
  for (const r of allPaid ?? []) paidSum.set(r.plan_id as string, (paidSum.get(r.plan_id as string) ?? 0) + Number(r.amount_minor) / 100);
  const out: LiveBill[] = [];
  for (const p of pays) {
    const plan = byPlan.get(p.plan_id as string);
    if (!plan) continue;
    const total = scheduleFor(plan).total.total;
    const paid = paidSum.get(plan.id) ?? 0;
    out.push({
      id: p.id as string, paidAt: (p.paid_at as string | null) ?? null, student: plan.client_name, email: plan.client_email, phone: plan.client_phone, course: plan.description,
      kind: p.kind as string, amountInr: Number(p.amount_minor) / 100, courseTotalInr: total, paidSoFarInr: paid, balanceInr: Math.max(0, Math.round((total - paid) * 100) / 100),
      invoiceNo: (p.invoice_no as string | null) ?? null, test: !!p.test_mode || !!plan.is_test, syncStatus: p.sync_status as string,
    });
  }
  return out;
}
