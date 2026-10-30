import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeDb } from './testing/fakeSupabase';

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb, emails: [] as string[], emailFail: false }));
vi.mock('@/lib/supabase/admin', () => ({ getSupabaseAdmin: () => state.db }));
vi.mock('@/lib/invoiceEmail', () => ({ sendInvoiceEmail: async (d: { invoice_no: string }) => { if (state.emailFail) return { status: 'failed', errMsg: 'x', pdfBase64: '' }; state.emails.push(d.invoice_no); return { status: 'sent', errMsg: null, pdfBase64: '' }; } }));
vi.mock('@/lib/invoicePdf', () => ({ toInvoicePdfData: (i: unknown) => i }));
vi.mock('@/lib/invoiceLog', () => ({ logInvoiceEvent: async () => {} }));
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({ id: 'e' }), isEmailConfigured: () => false, escapeHtml: (s: string) => s, getNotificationBcc: () => ['owner@example.com'] }));

import { fulfilCoursePayment, completeFulfilment, recordCourseRefund } from './coursePaymentFulfil';
import { summariseFy, reconcilePlans, type ReportInvoice, type PaymentRow } from './fyReport';

function seedPlan(structure: 'instalments' | 'full' = 'instalments') {
  const plan = { id: state.db.uuid(), token: 't'.repeat(32), client_name: 'SYNTHETIC Student', client_email: 'student@example.com', client_phone: null, client_type: 'individual', client_company: null, client_gst: null, client_state: 'Tamil Nadu', description: 'Rhino3D Training', structure, base_total: 30000, advance_base: structure === 'full' ? null : 15000, status: 'active', is_test: false };
  state.db.t('course_payment_plans').push(plan);
  return plan;
}
function seedOrder(planId: string, kind: 'advance' | 'balance' | 'full', amountMinor: number, orderId: string) {
  const row = { id: state.db.uuid(), plan_id: planId, kind, amount_minor: amountMinor, order_id: orderId, payment_id: null, status: 'created', sync_status: 'pending', sync_attempts: 0, invoice_emailed: false, test_mode: false, invoice_id: null, invoice_no: null };
  state.db.t('course_payments').push(row);
  return row;
}
const captured = (orderId: string, paymentId: string, amount: number, extra: Record<string, unknown> = {}) => ({ id: paymentId, order_id: orderId, amount, currency: 'INR', fee: 41300, tax: 6300, ...extra });
const bills = () => state.db.t('invoices') as unknown as (ReportInvoice & { id: string })[];

beforeEach(() => { state.db = new FakeDb(); state.emails = []; state.emailFail = false; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-03-20T06:00:00Z')); });
afterEach(() => vi.useRealTimers());

describe('advance then balance', () => {
  it('issues two separate bills, each with its own number, amount and GST', async () => {
    const plan = seedPlan();
    seedOrder(plan.id, 'advance', 1770000, 'order_A');
    expect((await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false)).ok).toBe(true);
    seedOrder(plan.id, 'balance', 1770000, 'order_B');
    vi.setSystemTime(new Date('2026-04-10T06:00:00Z'));
    expect((await fulfilCoursePayment(captured('order_B', 'pay_B', 1770000), false)).ok).toBe(true);

    expect(bills().map((b) => b.invoice_no)).toEqual(['YAFT-032026-01', 'YAFT-042026-01']);
    expect(bills().map((b) => Number(b.total))).toEqual([17700, 17700]);
    expect(bills().every((b) => b.course_plan_id === plan.id)).toBe(true);
    expect(bills()[0].items[0].rate).toBe(15000);
    expect(state.emails).toEqual(['YAFT-032026-01', 'YAFT-042026-01']);
    expect((state.db.t('course_payment_plans')[0] as { status: string }).status).toBe('complete');
  });

  it('records the Razorpay fee separately from the gross payment', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A');
    await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    const p = state.db.t('course_payments')[0] as { amount_minor: number; gateway_fee_minor: number };
    expect(p.amount_minor).toBe(1770000); expect(p.gateway_fee_minor).toBe(41300);
    expect(Number(bills()[0].total)).toBe(17700); // bill is the gross amount, fee never netted
  });

  it('puts the bills in different financial years and counts the revenue once each', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A');
    await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    seedOrder(plan.id, 'balance', 1770000, 'order_B'); vi.setSystemTime(new Date('2026-04-10T06:00:00Z'));
    await fulfilCoursePayment(captured('order_B', 'pay_B', 1770000), false);
    const a = summariseFy(2025, bills(), []), b = summariseFy(2026, bills(), []);
    expect([a.total, b.total]).toEqual([17700, 17700]);
    expect(a.total + b.total).toBe(35400);
    expect(reconcilePlans(state.db.t('course_payments') as unknown as PaymentRow[], bills(), [])).toEqual([]);
  });
});

describe('upfront full payment', () => {
  it('makes one bill for the whole fee', async () => {
    const plan = seedPlan('full'); seedOrder(plan.id, 'full', 3540000, 'order_F');
    await fulfilCoursePayment(captured('order_F', 'pay_F', 3540000), false);
    expect(bills().length).toBe(1); expect(Number(bills()[0].total)).toBe(35400);
    expect(bills()[0].items[0].desc).toBe('Rhino3D Training');
  });
});

describe('duplicate notification', () => {
  it('a repeated webhook creates no second bill and no second email', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A');
    await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    const again = await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    expect(again.body.duplicate).toBe(true);
    expect(bills().length).toBe(1); expect(state.emails.length).toBe(1);
  });
  it('two simultaneous deliveries still make one bill', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A');
    await Promise.all([fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false), fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false)]);
    expect(bills().length).toBe(1);
  });
  it('a second payment for an instalment already paid is flagged, not billed', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A'); seedOrder(plan.id, 'advance', 1770000, 'order_A2');
    await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    const r = await fulfilCoursePayment(captured('order_A2', 'pay_A2', 1770000), false);
    expect(r.body.flagged).toBe('overpayment'); expect(bills().length).toBe(1);
  });
});

describe('wrong amount', () => {
  it('issues nothing and flags the payment', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A');
    const r = await fulfilCoursePayment(captured('order_A', 'pay_A', 1000000), false);
    expect(r.body.flagged).toBe('amount'); expect(bills().length).toBe(0);
    expect((state.db.t('course_payments')[0] as { sync_status: string }).sync_status).toBe('mismatch');
  });
});

describe('failed synchronisation and safe retry', () => {
  it('a failed bill step is marked failed, flagged in reconciliation, and Retry fixes it without a duplicate', async () => {
    const plan = seedPlan(); const row = seedOrder(plan.id, 'advance', 1770000, 'order_A');
    state.db.failNext = { table: 'invoices', op: 'insert', message: 'connection reset' };
    const r = await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    expect(r.ok).toBe(false);
    expect(row.sync_status).toBe('failed'); expect(bills().length).toBe(0);
    expect(reconcilePlans(state.db.t('course_payments') as unknown as PaymentRow[], bills(), []).length).toBeGreaterThan(0);

    expect((await completeFulfilment(row.id)).ok).toBe(true);
    expect((await completeFulfilment(row.id)).ok).toBe(true); // retrying again is harmless
    expect(bills().length).toBe(1); expect(row.sync_status).toBe('ok'); expect(state.emails.length).toBe(1);
    expect(reconcilePlans(state.db.t('course_payments') as unknown as PaymentRow[], bills(), [])).toEqual([]);
  });
  it('a failed email keeps the bill, marks sync failed, and Retry sends it once', async () => {
    const plan = seedPlan(); const row = seedOrder(plan.id, 'advance', 1770000, 'order_A');
    state.emailFail = true;
    await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    expect(row.sync_status).toBe('failed'); expect(bills().length).toBe(1);
    state.emailFail = false;
    await completeFulfilment(row.id);
    expect(row.sync_status).toBe('ok'); expect(state.emails.length).toBe(1); expect(bills().length).toBe(1);
  });
});

describe('partial refund', () => {
  it('is recorded for review, only once, and changes no report total until a credit note is issued', async () => {
    const plan = seedPlan(); seedOrder(plan.id, 'advance', 1770000, 'order_A');
    await fulfilCoursePayment(captured('order_A', 'pay_A', 1770000), false);
    const refund = { id: 'rfnd_1', payment_id: 'pay_A', amount: 590000 };
    expect((await recordCourseRefund(refund)).body.recorded).toBe(true);
    expect((await recordCourseRefund(refund)).body.duplicate).toBe(true);
    const adj = state.db.t('invoice_adjustments');
    expect(adj.length).toBe(1);
    expect(summariseFy(2025, bills(), adj as never).total).toBe(17700);
    expect(summariseFy(2025, bills(), adj as never).creditTotal).toBe(0);
  });
  it('ignores refunds for payments that are not course payments', async () => {
    expect((await recordCourseRefund({ id: 'rfnd_x', payment_id: 'pay_tortoise', amount: 100 })).body.ignored).toBe(true);
  });
});
