import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { scheduleFor, billDescription, type PlanKind, type Instalment } from '@/lib/coursePayments';
import { sendInvoiceEmail, type InvoiceForEmail } from '@/lib/invoiceEmail';
import { toInvoicePdfData } from '@/lib/invoicePdf';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { sendEmail, isEmailConfigured, escapeHtml, getNotificationBcc } from '@/lib/email';
import { fmtFixed2 } from '@/lib/format';
import { loadLiveBills } from '@/lib/liveBills';
import { sendPushToAll } from '@/lib/webPush';

import { CONTACT_EMAIL } from '@/lib/contact';
type Plan = {
  id: string; client_name: string; client_email: string; client_phone: string | null; client_type: string;
  client_company: string | null; client_gst: string | null; client_pan: string | null; client_address: string | null; client_state: string; description: string;
  structure: 'instalments' | 'full'; base_total: number; advance_base: number | null; status: string; is_test: boolean;
};
type PaymentRow = {
  id: string; plan_id: string; kind: PlanKind; amount_minor: number | string; order_id: string; payment_id: string | null; status: string;
  paid_at: string | null; test_mode: boolean; invoice_id: string | null; invoice_no: string | null; invoice_emailed: boolean;
  sync_status: string; sync_attempts: number; charge_currency: 'INR' | 'USD'; charge_minor: number | string | null; fx_inr_per_usd: number | string | null;
};

export type FulfilResult = { ok: boolean; status: number; body: Record<string, unknown> };

function ddmmyyyy(d = new Date()): string {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(ist.getUTCDate())}/${p(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
}

/** Append-only audit trail. Ids and amounts only, never card data or full personal details. Never throws. */
export async function logCourseEvent(e: { planId?: string | null; paymentRowId?: string | null; razorpayPaymentId?: string | null; event: string; detail?: Record<string, unknown> }) {
  try {
    await getSupabaseAdmin().from('course_payment_events').insert({
      plan_id: e.planId ?? null, payment_row_id: e.paymentRowId ?? null, razorpay_payment_id: e.razorpayPaymentId ?? null, event: e.event, detail: e.detail ?? null,
    });
  } catch (err) { console.error('[course-payment] event log failed:', err); }
}

// Where the "payment received" alerts go. WhatsApp needs the paid WhatsApp Business API, so email (plus a phone push to subscribed admin devices) is used.
const PAYMENT_ALERT_TO = (process.env.PAYMENT_ALERT_EMAIL || 'yaftdesigns@gmail.com').trim();

async function ownerAlert(subject: string, html: string, to: string = getNotificationBcc()[0] ?? CONTACT_EMAIL) {
  if (!isEmailConfigured()) return;
  try { await sendEmail({ to, subject, html }); }
  catch (e) { console.error('[course-payment] owner alert failed:', e); }
}

/** YAFT-MMYYYY-NN like the admin invoice form; YAFT-TEST-... for test-mode payments so the real series stays clean. */
async function nextInvoiceNo(testMode: boolean, paymentId: string): Promise<string> {
  if (testMode) return `YAFT-TEST-${paymentId.slice(-8).toUpperCase()}`;
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const mmyyyy = String(ist.getUTCMonth() + 1).padStart(2, '0') + ist.getUTCFullYear();
  // The running number carries on across months (..., 21, 22, 23), so take the highest real YAFT-MMYYYY-NN ever issued (no PF or TEST ones) and add one.
  const { data } = await getSupabaseAdmin().from('invoices').select('invoice_no').like('invoice_no', 'YAFT-%').is('deleted_at', null);
  const used = (data ?? []).map((r) => /^YAFT-\d{6}-(\d+)$/.exec(String(r.invoice_no))?.[1]).filter(Boolean).map((n) => parseInt(n as string, 10));
  return `YAFT-${mmyyyy}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0')}`;
}

/**
 * Brings the accounting records in line with ONE paid instalment: one bill, emailed once, plan status updated.
 * Safe to run any number of times (webhook retries, admin Retry): every step checks what already exists.
 * Duplicate bills are also impossible at database level (unique index on invoices.course_payment_id).
 */
export async function completeFulfilment(rowId: string): Promise<{ ok: boolean; error?: string; invoiceNo?: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase.from('course_payments').select('*').eq('id', rowId).maybeSingle<PaymentRow>();
  if (!row || row.status !== 'paid' || !row.payment_id) return { ok: false, error: 'Payment not found or not paid' };
  const { data: plan } = await supabase.from('course_payment_plans').select('*').eq('id', row.plan_id).maybeSingle<Plan>();
  if (!plan) return { ok: false, error: 'Plan not found' };
  const testMode = row.test_mode;
  const alerts: string[] = [];

  try {
    const sched = scheduleFor(plan);
    const inst: Instalment = (row.kind === 'advance' ? sched.advance : row.kind === 'balance' ? sched.balance : sched.full)!;
    // The paid amount is authoritative; refuse to issue a bill that disagrees with it.
    if (Math.round(inst.total * 100) !== Number(row.amount_minor)) throw new Error('Bill amount does not match the instalment paid');

    // 1. The bill (own number, date, taxable amount and GST for just this instalment).
    let invoiceId = row.invoice_id;
    let invoiceNo = row.invoice_no;
    if (!invoiceId) {
      const { data: existing } = await supabase.from('invoices').select('id, invoice_no').eq('course_payment_id', row.id).maybeSingle();
      if (existing) { invoiceId = existing.id; invoiceNo = existing.invoice_no; }
    }
    if (!invoiceId) {
      let created: { id: string } | null = null;
      let no = '';
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        no = await nextInvoiceNo(testMode, row.payment_id);
        const { data, error } = await supabase.from('invoices').insert({
          invoice_no: no, date: ddmmyyyy(), client_name: plan.client_name, client_email: plan.client_email,
          client_type: plan.client_type, client_company: plan.client_company, client_gst: plan.client_gst, client_pan: plan.client_pan, client_address: plan.client_address,
          client_state: plan.client_state, client_phone: plan.client_phone,
          items: [{ desc: billDescription(plan.description, row.kind), qty: 1, rate: inst.base }],
          total: inst.total, advance: inst.total, balance: 0,
          invoice_type: testMode ? 'test' : 'training', status: 'sent',
          course_plan_id: plan.id, course_payment_id: row.id,
        }).select('id').single();
        if (!error && data) { created = data; break; }
        if (error?.code === '23505' && /course_payment/.test(error.message)) { // another delivery already made this bill
          const { data: ex } = await supabase.from('invoices').select('id, invoice_no').eq('course_payment_id', row.id).maybeSingle();
          if (ex) { invoiceId = ex.id; invoiceNo = ex.invoice_no; break; }
        }
        if (error?.code !== '23505') throw new Error(error?.message ?? 'bill insert failed');
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 350)); // number clash: pick again
      }
      if (created) {
        invoiceId = created.id; invoiceNo = no;
        await logInvoiceEvent({ invoiceId, invoiceNo: no, event: 'created', message: `Issued for ${row.kind} payment ${row.payment_id}, INR ${fmtFixed2(inst.total)}${testMode ? ' (TEST)' : ''}` });
      }
    }
    if (!invoiceId) throw new Error('could not create the bill');
    if (row.invoice_id !== invoiceId) await supabase.from('course_payments').update({ invoice_id: invoiceId, invoice_no: invoiceNo }).eq('id', row.id);

    // 2. Plan status: complete when the last bill is paid.
    if (row.kind === 'balance' || row.kind === 'full') await supabase.from('course_payment_plans').update({ status: 'complete' }).eq('id', plan.id);

    // 3. Email the bill once.
    if (!row.invoice_emailed) {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
      if (inv) {
        const res = await sendInvoiceEmail({ ...toInvoicePdfData(inv), grand_total: Number(inv.total) } as InvoiceForEmail, { attachPdf: false });
        if (res.status === 'failed') throw new Error('bill email failed to send');
        if (res.status === 'sent') {
          await supabase.from('course_payments').update({ invoice_emailed: true }).eq('id', row.id);
          await supabase.from('invoices').update({ email_sent_at: new Date().toISOString() }).eq('id', invoiceId);
        }
      }
      if (row.sync_status !== 'ok') {
        const [lb] = await loadLiveBills(1, row.id).catch(() => []);
        const inr = (n: number) => `INR ${fmtFixed2(n)}`;
        const tag = testMode ? '[TEST] ' : '';
        const left = lb ? lb.balanceInr : null;
        await ownerAlert(
          `${tag}Payment received: ${plan.client_name}, ${inr(inst.total)} (${row.kind})`,
          `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111">
<h3 style="margin:0 0 10px">${tag}Payment received</h3>
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:3px 14px 3px 0;color:#666">Student</td><td><strong>${escapeHtml(plan.client_name)}</strong> (${escapeHtml(plan.client_email)}${plan.client_phone ? `, ${escapeHtml(plan.client_phone)}` : ''})</td></tr>
<tr><td style="padding:3px 14px 3px 0;color:#666">Course</td><td>${escapeHtml(plan.description)}</td></tr>
<tr><td style="padding:3px 14px 3px 0;color:#666">Paid now (${row.kind})</td><td><strong>${inr(inst.total)}</strong> = base ${fmtFixed2(inst.base)} + GST ${fmtFixed2(inst.gst)}${row.charge_currency === 'USD' ? `, charged US$${Number(row.charge_minor) / 100} at ${Number(row.fx_inr_per_usd)} INR per USD` : ''}</td></tr>
${lb ? `<tr><td style="padding:3px 14px 3px 0;color:#666">Course total</td><td>${inr(lb.courseTotalInr)}</td></tr>
<tr><td style="padding:3px 14px 3px 0;color:#666">Paid so far</td><td>${inr(lb.paidSoFarInr)}</td></tr>
<tr><td style="padding:3px 14px 3px 0;color:#666">Left to pay</td><td><strong>${inr(lb.balanceInr)}</strong>${lb.balanceInr === 0 ? ' (fully paid)' : ''}</td></tr>` : ''}
<tr><td style="padding:3px 14px 3px 0;color:#666">Bill</td><td>${escapeHtml(invoiceNo ?? '')} (sent to the student as a student-portal link)</td></tr>
<tr><td style="padding:3px 14px 3px 0;color:#666">Payment id</td><td>${escapeHtml(row.payment_id)}</td></tr></table>
<p style="margin:14px 0 0"><a href="https://www.yaftdesigns.com/admin/training">Open Admin > Training > Live bills</a></p></div>`,
          PAYMENT_ALERT_TO,
        );
        sendPushToAll({ title: `${tag}Payment: ${plan.client_name} ${inr(inst.total)}`, body: `${plan.description}${left !== null ? `. Left: ${inr(left)}` : ''}`, url: '/admin/training' }).catch(() => {});
      }
    }

    await supabase.from('course_payments').update({ sync_status: 'ok', sync_error: null, synced_at: new Date().toISOString() }).eq('id', row.id);
    await logCourseEvent({ planId: plan.id, paymentRowId: row.id, razorpayPaymentId: row.payment_id, event: 'synced', detail: { kind: row.kind, invoice_no: invoiceNo } });
    return { ok: true, invoiceNo };
  } catch (err) {
    const msg = String((err as Error)?.message ?? err).slice(0, 300);
    console.error('[course-payment] fulfilment failed:', msg);
    await supabase.from('course_payments').update({ sync_status: 'failed', sync_error: msg, sync_attempts: (row.sync_attempts ?? 0) + 1 }).eq('id', row.id);
    await logCourseEvent({ planId: plan.id, paymentRowId: row.id, razorpayPaymentId: row.payment_id, event: 'sync_failed', detail: { error: msg } });
    if (row.sync_status !== 'failed') {
      alerts.push(`Payment ${row.payment_id} IS received but the bill step failed: ${msg}. Open Admin > Payment plans and press Retry.`);
      await ownerAlert(`${testMode ? '[TEST] ' : ''}Course payment needs attention`, `<ul>${alerts.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`);
    }
    return { ok: false, error: msg };
  }
}

/** Webhook entry for payment.captured with notes.product = course_payment. */
export async function fulfilCoursePayment(pay: Record<string, unknown>, testMode: boolean): Promise<FulfilResult> {
  const supabase = getSupabaseAdmin();
  const orderId = String(pay.order_id ?? '');
  const paymentId = String(pay.id ?? '');
  const paidAmount = Number(pay.amount ?? 0);
  if (!orderId || !paymentId) return { ok: false, status: 400, body: { error: 'Missing payment data' } };

  const { data: row } = await supabase.from('course_payments').select('*').eq('order_id', orderId).maybeSingle<PaymentRow>();
  if (!row) {
    await logCourseEvent({ razorpayPaymentId: paymentId, event: 'unknown_order', detail: { order_id: orderId, amount_minor: paidAmount } });
    await ownerAlert(`Course payment NOT matched: ${paymentId}`, `<p>Razorpay payment ${escapeHtml(paymentId)} (${paidAmount / 100} ${escapeHtml(String(pay.currency ?? ''))}) came in for order ${escapeHtml(orderId)}, which is not in the payment plans table. Check it in Razorpay.</p>`);
    return { ok: true, status: 200, body: { ok: true, flagged: 'unknown_order' } };
  }

  if (row.status === 'paid') {
    // Duplicate or retried delivery. If the previous run did not finish, finish it; otherwise nothing to do.
    if (row.sync_status === 'ok') { await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: 'duplicate_webhook' }); return { ok: true, status: 200, body: { ok: true, duplicate: true } }; }
    const r = await completeFulfilment(row.id);
    return r.ok ? { ok: true, status: 200, body: { ok: true, resumed: true } } : { ok: false, status: 500, body: { error: 'Fulfilment failed' } };
  }

  // What the client was asked to pay: INR bill amount, or the frozen USD quote for USD checkouts.
  const expectedMinor = Number(row.charge_minor ?? row.amount_minor);
  const expectedCurrency = row.charge_currency ?? 'INR';
  if (paidAmount !== expectedMinor || String(pay.currency ?? 'INR') !== expectedCurrency) {
    await supabase.from('course_payments').update({ sync_status: 'mismatch', sync_error: `Razorpay amount ${paidAmount} ${String(pay.currency ?? '')} differs from the quote ${expectedMinor} ${expectedCurrency}` }).eq('id', row.id);
    await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: 'amount_mismatch', detail: { paid_minor: paidAmount, expected_minor: expectedMinor, currency: String(pay.currency ?? '') } });
    await ownerAlert(`Course payment NOT fulfilled (amount check): ${paymentId}`, `<p>Payment ${escapeHtml(paymentId)} was ${paidAmount / 100} ${escapeHtml(String(pay.currency ?? ''))} but the quote was ${expectedMinor / 100} ${expectedCurrency}. No bill was created. Check it in Razorpay.</p>`);
    return { ok: true, status: 200, body: { ok: true, flagged: 'amount' } };
  }

  // Claim: only one delivery can flip created -> paid. The unique index also stops two paid payments for the same instalment.
  const fee = Number(pay.fee), tax = Number(pay.tax);
  const { data: claimed, error: claimErr } = await supabase.from('course_payments')
    .update({ status: 'paid', payment_id: paymentId, paid_at: new Date().toISOString(), test_mode: testMode, gateway_fee_minor: Number.isFinite(fee) ? fee : null, gateway_tax_minor: Number.isFinite(tax) ? tax : null })
    .eq('id', row.id).eq('status', 'created').select('id');
  if (claimErr) {
    if (claimErr.code === '23505') { // a different payment already settled this instalment: overpayment
      await supabase.from('course_payments').update({ sync_status: 'mismatch', sync_error: 'Second payment for an instalment already paid' }).eq('id', row.id);
      await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: 'overpayment', detail: { kind: row.kind } });
      await ownerAlert(`Course payment: DUPLICATE instalment ${paymentId}`, `<p>Payment ${escapeHtml(paymentId)} is a second payment for an instalment that was already paid. No second bill was created. Refund it from Razorpay if it is an overpayment.</p>`);
      return { ok: true, status: 200, body: { ok: true, flagged: 'overpayment' } };
    }
    return { ok: false, status: 500, body: { error: 'DB error' } };
  }
  if (!claimed || claimed.length === 0) return { ok: true, status: 200, body: { ok: true, duplicate: true } };
  await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: 'payment_captured', detail: { kind: row.kind, amount_minor: paidAmount } });

  // Full and instalment payments overlapping (two checkouts open at once): money is real, so bill it, but tell the owner.
  const { data: others } = await supabase.from('course_payments').select('kind').eq('plan_id', row.plan_id).eq('status', 'paid').neq('id', row.id);
  const otherKinds = (others ?? []).map((o) => o.kind as string);
  if ((row.kind === 'full' && otherKinds.some((k) => k !== 'full')) || (row.kind !== 'full' && otherKinds.includes('full'))) {
    await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: 'overlap_full_and_instalments' });
    await ownerAlert('Course payment: client paid twice (full and instalment)', `<p>Payment ${escapeHtml(paymentId)} overlaps with another payment on the same plan. Both were billed. Refund the extra from Razorpay, then raise a credit note under Admin &gt; Payment plans.</p>`);
  }

  const r = await completeFulfilment(row.id);
  return r.ok ? { ok: true, status: 200, body: { ok: true, invoice: r.invoiceNo, kind: row.kind } } : { ok: false, status: 500, body: { error: 'Fulfilment failed' } };
}

/** refund.processed for a course payment: record it for review. It changes no report total until a credit note is issued. */
export async function recordCourseRefund(refund: Record<string, unknown>): Promise<FulfilResult> {
  const supabase = getSupabaseAdmin();
  const refundId = String(refund.id ?? '');
  const paymentId = String(refund.payment_id ?? '');
  const amount = Number(refund.amount ?? 0);
  if (!refundId || !paymentId) return { ok: true, status: 200, body: { ok: true, ignored: true } };
  const { data: row } = await supabase.from('course_payments').select('id, plan_id, invoice_id, test_mode').eq('payment_id', paymentId).maybeSingle();
  if (!row) {
    // A duplicate payment (second payment for an instalment already paid) was never billed and its Razorpay id was never
    // stored on a payment row; only the audit trail knows it. Refunding it is the correct fix, so record it as settled.
    const { data: dup } = await supabase.from('course_payment_events').select('plan_id, payment_row_id').eq('event', 'overpayment').eq('razorpay_payment_id', paymentId).maybeSingle();
    if (!dup) return { ok: true, status: 200, body: { ok: true, ignored: true } }; // not a course payment (e.g. Tortoise)
    const { error: dupErr } = await supabase.from('invoice_adjustments').insert({
      plan_id: dup.plan_id, payment_row_id: dup.payment_row_id, invoice_id: null, razorpay_refund_id: refundId, refund_minor: amount,
      status: 'dismissed', reason: 'Refund of a duplicate payment that was never billed: no bill was issued, so no credit note is needed.',
    });
    if (dupErr) return dupErr.code === '23505' ? { ok: true, status: 200, body: { ok: true, duplicate: true } } : { ok: false, status: 500, body: { error: 'DB error' } };
    if (dup.payment_row_id) await supabase.from('course_payments').update({ sync_status: 'ok', sync_error: 'Duplicate payment refunded' }).eq('id', dup.payment_row_id).eq('sync_status', 'mismatch');
    await logCourseEvent({ planId: dup.plan_id, paymentRowId: dup.payment_row_id, razorpayPaymentId: paymentId, event: 'duplicate_payment_refunded', detail: { refund_id: refundId, amount_minor: amount } });
    return { ok: true, status: 200, body: { ok: true, recorded: true, unbilled_duplicate: true } };
  }

  const { error } = await supabase.from('invoice_adjustments').insert({
    plan_id: row.plan_id, payment_row_id: row.id, invoice_id: row.invoice_id, razorpay_refund_id: refundId, refund_minor: amount,
    status: 'needs_review', is_test: row.test_mode,
  });
  if (error) {
    if (error.code === '23505') return { ok: true, status: 200, body: { ok: true, duplicate: true } };
    return { ok: false, status: 500, body: { error: 'DB error' } };
  }
  await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: 'refund_recorded', detail: { refund_id: refundId, amount_minor: amount } });
  await ownerAlert(`${row.test_mode ? '[TEST] ' : ''}Refund processed: needs a credit note`, `<p>Razorpay refunded INR ${fmtFixed2(amount / 100)} on payment ${escapeHtml(paymentId)}. Open Admin &gt; Payment plans &gt; Refunds to issue the credit note (or dismiss it).</p>`);
  return { ok: true, status: 200, body: { ok: true, recorded: true } };
}

/** Disputes/chargebacks are a payment reversal: flag for review, do not change accounts automatically. */
export async function flagCourseDispute(dispute: Record<string, unknown>, eventName: string): Promise<FulfilResult> {
  const paymentId = String(dispute.payment_id ?? '');
  if (!paymentId) return { ok: true, status: 200, body: { ok: true, ignored: true } };
  const { data: row } = await getSupabaseAdmin().from('course_payments').select('id, plan_id').eq('payment_id', paymentId).maybeSingle();
  if (!row) return { ok: true, status: 200, body: { ok: true, ignored: true } };
  await getSupabaseAdmin().from('course_payments').update({ sync_status: 'mismatch', sync_error: `Razorpay event ${eventName}` }).eq('id', row.id);
  await logCourseEvent({ planId: row.plan_id, paymentRowId: row.id, razorpayPaymentId: paymentId, event: eventName });
  await ownerAlert('Course payment: dispute or reversal', `<p>Razorpay reported ${escapeHtml(eventName)} on payment ${escapeHtml(paymentId)}. Review it in Razorpay and in Admin &gt; Payment plans. No accounting entry was changed automatically.</p>`);
  return { ok: true, status: 200, body: { ok: true, flagged: eventName } };
}
