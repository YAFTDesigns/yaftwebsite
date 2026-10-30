import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitShared } from '@/lib/rateLimitShared';
import { createOrder, razorpayConfig } from '@/lib/razorpay';
import { scheduleFor, nextDue, toPaise } from '@/lib/coursePayments';
import { validateBillingDetails } from '@/lib/billingDetails';

// POST /api/pay/<token>/order -> Razorpay order for whichever instalment is due next on this plan.
// The amount always comes from the plan in the database, never from the browser.
export async function POST(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const limited = await rateLimitShared(request, 'pay-order', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.json({ error: 'Invalid link.' }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data: plan } = await supabase.from('course_payment_plans').select('*').eq('token', token).maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Invalid link.' }, { status: 404 });
  if (plan.status !== 'active') return NextResponse.json({ error: plan.status === 'complete' ? 'This plan is fully paid.' : 'This payment link is no longer active.' }, { status: 409 });

  // Test plans only work in test mode and live plans only in live mode, so the two never mix.
  if (Boolean(plan.is_test) !== razorpayConfig().test) return NextResponse.json({ error: 'This payment link is not available right now.' }, { status: 409 });

  const { data: paid } = await supabase.from('course_payments').select('kind').eq('plan_id', plan.id).eq('status', 'paid');
  let due = nextDue({ structure: plan.structure, paid: (paid ?? []).map((r) => r.kind) });
  // On an instalment plan the client may choose to pay everything now, but only before paying any advance.
  const body = await request.json().catch(() => null);
  if (due === 'advance' && body?.choice === 'full') due = 'full';
  if (!due) return NextResponse.json({ error: 'Nothing is due on this plan.' }, { status: 409 });

  // Before the first payment the client fills in their own billing details (PAN/GSTIN, company, address, state).
  // After the first payment they are locked, because a bill has been issued with them; changes go through YAFT.
  let billing = { name: plan.client_name as string, email: plan.client_email as string };
  if ((paid ?? []).length === 0) {
    const v = validateBillingDetails(body?.details);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const { error: saveErr } = await supabase.from('course_payment_plans').update({ ...v.value, details_confirmed_at: new Date().toISOString() }).eq('id', plan.id);
    if (saveErr) { console.error('[pay-order] saving billing details failed:', saveErr); return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 }); }
    billing = { name: v.value.client_name, email: v.value.client_email };
  }

  const sched = scheduleFor(plan);
  const amountMinor = toPaise((due === 'advance' ? sched.advance : due === 'balance' ? sched.balance : sched.full)!.total);
  try {
    const order = await createOrder({
      amount: amountMinor, currency: 'INR', receipt: `crs_${Date.now()}`,
      notes: { product: 'course_payment', plan_id: plan.id, kind: due, client: String(plan.client_name).slice(0, 80) },
    });
    const { error } = await supabase.from('course_payments').insert({
      plan_id: plan.id, kind: due, amount_minor: amountMinor, order_id: order.id, test_mode: razorpayConfig().test,
    });
    if (error) throw error;
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpayConfig().keyId, kind: due, name: billing.name, email: billing.email });
  } catch (err) {
    console.error('[pay-order] failed:', err);
    return NextResponse.json({ error: 'Could not start the payment. Please try again or contact YAFT Designs.' }, { status: 502 });
  }
}
