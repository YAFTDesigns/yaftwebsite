import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { scheduleFor, nextDue, type PlanKind } from '@/lib/coursePayments';
import { fmtFixed2 } from '@/lib/format';
import PayClient from './PayClient';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getInrPerUsd, usdMinorFor, fxBufferPercent } from '@/lib/fx';

import { CONTACT_EMAIL } from '@/lib/contact';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pay', robots: { index: false, follow: false } };

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) notFound();
  const supabase = getSupabaseAdmin();
  const { data: plan } = await supabase.from('course_payment_plans').select('*').eq('token', token).maybeSingle();
  if (!plan) notFound();
  const { data: paid } = await supabase.from('course_payments').select('kind').eq('plan_id', plan.id).eq('status', 'paid');
  const kinds = new Set((paid ?? []).map((r) => r.kind as PlanKind));
  const due = plan.status === 'active' ? nextDue({ structure: plan.structure, paid: kinds }) : null;
  const s = scheduleFor(plan);
  const quote = plan.currency === 'USD' ? await getInrPerUsd() : null;
  const usdOf = (inr: number) => (quote ? usdMinorFor(inr, quote.inrPerUsd, fxBufferPercent()) / 100 : undefined);
  const amountDue = due ? (due === 'advance' ? s.advance : due === 'balance' ? s.balance : s.full)! : null;
  const chip = (state: string) => (state ? <span className={`chip ${state === 'Due now' ? 'chip-due' : /^Paid/.test(state) ? 'chip-paid' : ''}`}>{state}</span> : null);
  const row = (label: string, v: { base: number; gst: number; total: number }, state: string) => (
    <tr><td>{label}</td><td>₹{fmtFixed2(v.base)}</td><td>₹{fmtFixed2(v.gst)}</td><td><strong>₹{fmtFixed2(v.total)}</strong></td><td>{chip(state)}</td></tr>
  );
  return (
    <>
    <SiteHeader />
    <main className="pay-page" style={{ color: 'var(--ink)' }}>
      <div className="eyebrow">SECURE PAYMENT</div>
      <h1>{plan.description}</h1>
      <p className="pay-lede">Billed to <strong>{plan.client_name}</strong>. Each payment gets its own GST tax invoice by email.</p>
      <table className="pay-table">
        <thead><tr><th>Instalment</th><th>Base</th><th>GST 18%</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {s.structure === 'full'
            ? row('Full payment', s.full!, kinds.has('full') ? 'Paid' : 'Due now')
            : <>
                {row('Advance', s.advance!, kinds.has('advance') ? 'Paid' : due === 'advance' ? 'Due now' : kinds.has('full') ? 'Not needed' : 'Pending')}
                {row('Balance', s.balance!, kinds.has('balance') ? 'Paid' : due === 'balance' ? 'Due now' : kinds.has('full') ? 'Not needed' : 'Locked until the advance is paid')}
                {row('Pay everything at once', s.total, kinds.has('full') ? 'Paid in full' : due === 'advance' ? 'Option' : '')}
              </>}
        </tbody>
      </table>
      {plan.status === 'cancelled' ? <p>This payment link is no longer active. Please contact us.</p>
        : due && amountDue ? <PayClient token={token} locked={kinds.size > 0} initial={{ client_name: plan.client_name, client_email: plan.client_email, client_phone: plan.client_phone ?? '', client_type: plan.client_type === 'company' ? 'company' : 'individual', client_company: plan.client_company ?? '', client_gst: plan.client_gst ?? '', client_pan: plan.client_pan ?? '', client_address: plan.client_address ?? '', client_state: plan.client_state }} outsideOk={plan.currency === 'USD'} options={due === 'advance' ? [{ choice: 'advance', label: 'Pay advance', amount: s.advance!.total, usd: usdOf(s.advance!.total) }, { choice: 'full', label: 'Pay full amount', amount: s.total.total, usd: usdOf(s.total.total) }] : [{ choice: due, label: due === 'balance' ? 'Pay balance' : 'Pay full amount', amount: amountDue.total, usd: usdOf(amountDue.total) }]} />
        : <p>All paid. Thank you. Your tax invoice was emailed to you.</p>}
      <p className="pay-note">
        Your billing details are used only to issue your tax invoice (see our <a href="/privacy" style={{ textDecoration: 'underline' }}>privacy policy</a>). Secure payment by Razorpay.{plan.currency === 'USD' ? ' Amounts in US$ are worked out from the live exchange rate when you press Pay and are fixed for that payment. Your tax invoice is issued in INR.' : ''} Each payment gets its own tax invoice with GST, emailed to you. Fees are non-transferable and subject to our <a href="/terms" style={{ textDecoration: 'underline' }}>terms</a>. Questions: {CONTACT_EMAIL}
      </p>
    </main>
    <SiteFooter />
    </>
  );
}
