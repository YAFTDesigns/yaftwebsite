import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createOrder, razorpayConfig } from '@/lib/razorpay';
import { scheduleFor, nextDue, toPaise, type PlanKind } from '@/lib/coursePayments';
import { validateBillingDetails } from '@/lib/billingDetails';
import { getInrPerUsd, usdMinorFor, fxBufferPercent } from '@/lib/fx';

export type OrderResult =
  | { ok: true; orderId: string; amount: number; currency: string; keyId: string | undefined; kind: PlanKind; name: string; email: string }
  | { ok: false; status: number; error: string };

type PlanRow = {
  id: string; status: string; is_test: boolean; structure: 'instalments' | 'full'; base_total: number; advance_base: number | null;
  client_name: string; client_email: string; currency: 'INR' | 'USD';
};

/**
 * Creates the Razorpay order for whatever is due next on a plan. Used by the private pay link and by checkout.
 * The amount always comes from the plan in the database. For USD plans the charge is the live-rate quote at this
 * moment, frozen on the payment row; the INR bill amount never changes with the rate.
 */
export async function createCourseOrder(plan: PlanRow, body: { choice?: unknown; details?: unknown } | null): Promise<OrderResult> {
  const supabase = getSupabaseAdmin();
  if (plan.status !== 'active') return { ok: false, status: 409, error: plan.status === 'complete' ? 'This plan is fully paid.' : 'This payment link is no longer active.' };
  // Test plans only work in test mode and live plans only in live mode, so the two never mix.
  if (Boolean(plan.is_test) !== razorpayConfig().test) return { ok: false, status: 409, error: 'This payment link is not available right now.' };

  const { data: paid } = await supabase.from('course_payments').select('kind').eq('plan_id', plan.id).eq('status', 'paid');
  let due = nextDue({ structure: plan.structure, paid: (paid ?? []).map((r) => r.kind) });
  // On an instalment plan the client may choose to pay everything now, but only before paying any advance.
  if (due === 'advance' && body?.choice === 'full') due = 'full';
  if (!due) return { ok: false, status: 409, error: 'Nothing is due on this plan.' };

  // Before the first payment the client fills in their own billing details. After it they are locked (a bill exists).
  let billing = { name: plan.client_name, email: plan.client_email };
  if ((paid ?? []).length === 0) {
    const v = validateBillingDetails(body?.details, { allowOutsideIndia: plan.currency === 'USD' });
    if (!v.ok) return { ok: false, status: 400, error: v.error };
    const { error: saveErr } = await supabase.from('course_payment_plans').update({ ...v.value, details_confirmed_at: new Date().toISOString() }).eq('id', plan.id);
    if (saveErr) { console.error('[course-order] saving billing details failed:', saveErr); return { ok: false, status: 500, error: 'Could not save your details. Please try again.' }; }
    billing = { name: v.value.client_name, email: v.value.client_email };
  }

  const sched = scheduleFor(plan);
  const inst = (due === 'advance' ? sched.advance : due === 'balance' ? sched.balance : sched.full)!;
  const billMinor = toPaise(inst.total);
  let chargeCurrency: 'INR' | 'USD' = 'INR';
  let chargeMinor = billMinor;
  let fx: number | null = null;
  if (plan.currency === 'USD') {
    const q = await getInrPerUsd();
    if (!q) return { ok: false, status: 503, error: 'USD payment is unavailable right now. Please try again later or choose INR.' };
    chargeCurrency = 'USD'; fx = q.inrPerUsd; chargeMinor = usdMinorFor(inst.total, q.inrPerUsd, fxBufferPercent());
  }

  try {
    const order = await createOrder({
      amount: chargeMinor, currency: chargeCurrency, receipt: `crs_${Date.now()}`,
      notes: { product: 'course_payment', plan_id: plan.id, kind: due, client: String(billing.name).slice(0, 80) },
    });
    const { error } = await supabase.from('course_payments').insert({
      plan_id: plan.id, kind: due, amount_minor: billMinor, order_id: order.id, test_mode: razorpayConfig().test,
      charge_currency: chargeCurrency, charge_minor: chargeMinor, fx_inr_per_usd: fx,
    });
    if (error) throw error;
    return { ok: true, orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayConfig().keyId, kind: due, name: billing.name, email: billing.email };
  } catch (err) {
    console.error('[course-order] failed:', err);
    return { ok: false, status: 502, error: 'Could not start the payment. Please try again or contact YAFT Designs.' };
  }
}
