import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { scheduleFor, nextDue, type PlanKind } from '@/lib/coursePayments';
import { fmtFixed2 } from '@/lib/format';
import PayClient from './PayClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pay | YAFT Designs', robots: { index: false, follow: false } };

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
  const amountDue = due ? (due === 'advance' ? s.advance : due === 'balance' ? s.balance : s.full)! : null;
  const row = (label: string, v: { base: number; gst: number; total: number }, state: string) => (
    <tr><td>{label}</td><td>₹{fmtFixed2(v.base)}</td><td>₹{fmtFixed2(v.gst)}</td><td><strong>₹{fmtFixed2(v.total)}</strong></td><td>{state}</td></tr>
  );
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 20px', color: 'var(--ink)' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>YAFT Designs</h1>
      <p style={{ marginBottom: 24, opacity: 0.8 }}>Payment for {plan.description}<br />Billed to {plan.client_name}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 14 }}>
        <thead><tr style={{ textAlign: 'left' }}><th>Instalment</th><th>Base</th><th>GST 18%</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {s.structure === 'full'
            ? row('Full payment', s.full!, kinds.has('full') ? 'Paid' : 'Due now')
            : <>
                {row('Advance', s.advance!, kinds.has('advance') ? 'Paid' : due === 'advance' ? 'Due now' : 'Pending')}
                {row('Balance', s.balance!, kinds.has('balance') ? 'Paid' : due === 'balance' ? 'Due now' : 'Locked until the advance is paid')}
                {row('Course total', s.total, plan.status === 'complete' ? 'Paid in full' : '')}
              </>}
        </tbody>
      </table>
      {plan.status === 'cancelled' ? <p>This payment link is no longer active. Please contact us.</p>
        : due && amountDue ? <PayClient token={token} label={due === 'advance' ? 'Pay advance' : due === 'balance' ? 'Pay balance' : 'Pay full amount'} amount={amountDue.total} />
        : <p>All paid. Thank you. Your tax invoice was emailed to you.</p>}
      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 28 }}>
        Secure payment by Razorpay. Each payment gets its own tax invoice, emailed to you. Fees are non-transferable and subject to our <a href="/terms" style={{ textDecoration: 'underline' }}>terms</a>. Questions: yaftdesigns@gmail.com
      </p>
    </main>
  );
}
