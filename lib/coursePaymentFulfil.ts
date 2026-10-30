import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeSchedule } from '@/lib/coursePayments';
import { sendInvoiceEmail, type InvoiceForEmail } from '@/lib/invoiceEmail';
import { toInvoicePdfData } from '@/lib/invoicePdf';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { sendEmail, isEmailConfigured, escapeHtml, getNotificationBcc } from '@/lib/email';
import { fmtFixed2 } from '@/lib/format';

type Plan = {
  id: string; client_name: string; client_email: string; client_phone: string | null; client_type: string;
  client_company: string | null; client_gst: string | null; client_state: string; description: string;
  base_total: number; advance_base: number; status: string; invoice_id: string | null; invoice_no: string | null;
};
type PaymentRow = { id: string; plan_id: string; kind: 'advance' | 'balance'; amount_minor: number; order_id: string; payment_id: string | null; status: string; paid_at: string | null; fulfilled: boolean; test_mode: boolean };

function ddmmyyyy(d = new Date()): string {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(ist.getUTCDate())}/${p(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
}

/** YAFT-MMYYYY-NN like the admin invoice form; YAFT-TEST-... for test-mode payments so the real series stays clean. */
async function nextInvoiceNo(testMode: boolean, paymentId: string): Promise<string> {
  if (testMode) return `YAFT-TEST-${paymentId.slice(-8).toUpperCase()}`;
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const mmyyyy = String(ist.getUTCMonth() + 1).padStart(2, '0') + ist.getUTCFullYear();
  const { data } = await getSupabaseAdmin().from('invoices').select('invoice_no').like('invoice_no', `YAFT-${mmyyyy}-%`);
  const used = (data ?? []).map((r) => parseInt(String(r.invoice_no).split('-').pop() ?? '0', 10)).filter((n) => !Number.isNaN(n));
  return `YAFT-${mmyyyy}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0')}`;
}

export type FulfilResult = { ok: boolean; status: number; body: Record<string, unknown> };

async function ownerAlert(subject: string, html: string) {
  if (!isEmailConfigured()) return;
  try { await sendEmail({ to: getNotificationBcc()[0] ?? 'yaftdesigns@gmail.com', subject, html }); }
  catch (e) { console.error('[course-payment] owner alert failed:', e); }
}

/** Called by the Razorpay webhook for payment.captured events whose order notes say product=course_payment. */
export async function fulfilCoursePayment(pay: Record<string, unknown>, testMode: boolean): Promise<FulfilResult> {
  const supabase = getSupabaseAdmin();
  const orderId = String(pay.order_id ?? '');
  const paymentId = String(pay.id ?? '');
  const paidAmount = Number(pay.amount ?? 0);
  if (!orderId || !paymentId) return { ok: false, status: 400, body: { error: 'Missing payment data' } };

  const { data: row } = await supabase.from('course_payments').select('*').eq('order_id', orderId).maybeSingle<PaymentRow>();
  if (!row) {
    console.error('[course-payment] no row for order', orderId);
    await ownerAlert(`Course payment NOT matched: ${paymentId}`, `<p>Razorpay payment ${escapeHtml(paymentId)} (${paidAmount / 100} ${escapeHtml(String(pay.currency ?? ''))}) came in for order ${escapeHtml(orderId)}, which is not in the payment plans table. Check it in Razorpay.</p>`);
    return { ok: true, status: 200, body: { ok: true, flagged: 'unknown_order' } };
  }

  if (row.status === 'paid') {
    if (row.fulfilled) return { ok: true, status: 200, body: { ok: true, duplicate: true } };
    const ageMs = Date.now() - new Date(row.paid_at ?? row.id).getTime();
    if (ageMs < 120_000) return { ok: false, status: 503, body: { error: 'In progress' } }; // Razorpay retries
    console.error('[course-payment] resuming stale fulfilment for', paymentId);
  } else {
    if (paidAmount !== Number(row.amount_minor) || String(pay.currency ?? 'INR') !== 'INR') {
      await ownerAlert(`Course payment NOT fulfilled (amount check): ${paymentId}`, `<p>Payment ${escapeHtml(paymentId)} was ${paidAmount / 100} ${escapeHtml(String(pay.currency ?? ''))} but the instalment was ${Number(row.amount_minor) / 100} INR. No invoice was created. Check it in Razorpay.</p>`);
      return { ok: true, status: 200, body: { ok: true, flagged: 'amount' } };
    }
    // Claim: only one delivery can flip created -> paid.
    const { data: claimed, error: claimErr } = await supabase.from('course_payments')
      .update({ status: 'paid', payment_id: paymentId, paid_at: new Date().toISOString(), test_mode: testMode })
      .eq('id', row.id).eq('status', 'created').select('id');
    if (claimErr) return { ok: false, status: 500, body: { error: 'DB error' } };
    if (!claimed || claimed.length === 0) return { ok: true, status: 200, body: { ok: true, duplicate: true } };
  }

  const { data: plan } = await supabase.from('course_payment_plans').select('*').eq('id', row.plan_id).maybeSingle<Plan>();
  if (!plan) return { ok: false, status: 500, body: { error: 'Plan missing' } };

  const sched = computeSchedule(plan.base_total, plan.advance_base);
  const alerts: string[] = [];
  let invoiceNo = plan.invoice_no;
  let invoiceId = plan.invoice_id;
  const items = [{ desc: plan.description, qty: 1, rate: plan.base_total }];

  try {
    if (!invoiceId) {
      // First payment creates the invoice for the full fee: total, advance paid, balance due.
      let created: { id: string } | null = null;
      let no = '';
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        no = await nextInvoiceNo(testMode, paymentId);
        const { data, error } = await supabase.from('invoices').insert({
          invoice_no: no, date: ddmmyyyy(), client_name: plan.client_name, client_email: plan.client_email,
          client_type: plan.client_type, client_company: plan.client_company, client_gst: plan.client_gst,
          client_state: plan.client_state, client_phone: plan.client_phone, items,
          total: sched.total.total,
          advance: row.kind === 'advance' ? sched.advance.total : sched.total.total,
          balance: row.kind === 'advance' ? sched.balance.total : 0,
          invoice_type: testMode ? 'test' : 'training', status: 'sent', email_sent_at: new Date().toISOString(),
        }).select('id').single();
        if (!error && data) created = data;
        else if (error?.code !== '23505') throw new Error(error?.message ?? 'invoice insert failed');
        else await new Promise((r) => setTimeout(r, 150 + Math.random() * 350));
      }
      if (!created) throw new Error('could not pick an invoice number');
      invoiceId = created.id; invoiceNo = no;
      await supabase.from('course_payment_plans').update({ invoice_id: invoiceId, invoice_no: invoiceNo }).eq('id', plan.id);
      await logInvoiceEvent({ invoiceId, invoiceNo: no, event: 'created', message: `Auto-created from ${row.kind} payment ${paymentId}, INR ${fmtFixed2(Number(row.amount_minor) / 100)} of ${fmtFixed2(sched.total.total)}${testMode ? ' (TEST)' : ''}` });
    } else if (row.kind === 'balance') {
      await supabase.from('invoices').update({ advance: sched.total.total, balance: 0 }).eq('id', invoiceId);
      await logInvoiceEvent({ invoiceId, invoiceNo: invoiceNo ?? '', event: 'payment_updated', message: `Balance paid via ${paymentId}, INR ${fmtFixed2(Number(row.amount_minor) / 100)}. Marked paid in full.` });
    }
    if (row.kind === 'balance') await supabase.from('course_payment_plans').update({ status: 'complete' }).eq('id', plan.id);

    // Email the current invoice state (advance paid + balance due, or paid in full).
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
    if (inv) {
      const pdfData = toInvoicePdfData(inv);
      const res = await sendInvoiceEmail({ ...pdfData, grand_total: Number(inv.total) } as InvoiceForEmail);
      if (res.status === 'failed') alerts.push(`The invoice email to ${plan.client_email} failed to send. Resend it from Admin > Invoices.`);
    }
  } catch (err) {
    console.error('[course-payment] fulfilment failed:', err);
    alerts.push(`Invoice step failed (${String(err).slice(0, 150)}). Payment ${paymentId} IS received. Create or fix the invoice manually in Admin > Invoices.`);
    await ownerAlert(`${testMode ? '[TEST] ' : ''}Course payment needs attention: ${paymentId}`, `<ul>${alerts.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`);
    return { ok: false, status: 500, body: { error: 'Fulfilment failed' } }; // Razorpay retries; the resume path above picks it up
  }

  await supabase.from('course_payments').update({ fulfilled: true }).eq('id', row.id);
  await ownerAlert(
    `${testMode ? '[TEST] ' : ''}Payment received: ${plan.client_name} (${row.kind})`,
    `<p>${escapeHtml(plan.client_name)} paid the <strong>${row.kind}</strong>: INR ${fmtFixed2(Number(row.amount_minor) / 100)} for ${escapeHtml(plan.description)}.</p>
<p>Invoice ${escapeHtml(invoiceNo ?? '')} ${row.kind === 'balance' ? 'is now paid in full' : `shows balance due INR ${fmtFixed2(sched.balance.total)}`}. It was emailed to the client (you are on BCC).</p>
${alerts.length ? `<ul>${alerts.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : ''}<p>Payment ${escapeHtml(paymentId)}</p>`,
  );
  return { ok: true, status: 200, body: { ok: true, invoice: invoiceNo, kind: row.kind } };
}
