'use client';

import { useState } from 'react';
import { fmtFixed2 } from '@/lib/format';
import BillingForm, { type Details } from '@/components/BillingForm';

import { CONTACT_EMAIL } from '@/lib/contact';
type Opts = {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  prefill: { name: string; email: string }; handler: () => void; modal: { ondismiss: () => void }; theme: { color: string };
};
type RzpWindow = { Razorpay?: new (o: Opts) => { open: () => void } };
const rzp = () => (window as unknown as RzpWindow).Razorpay;

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (rzp()) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type Option = { choice: string; label: string; amount: number; usd?: number };
export default function PayClient({ token, options, initial, locked, outsideOk }: { token: string; options: Option[]; initial: Details; locked: boolean; outsideOk?: boolean }) {
  const [d, setD] = useState<Details>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k: keyof Details, v: string) => setD((x) => ({ ...x, [k]: v }));

  async function pay(choice: string) {
    setError(''); setBusy(true);
    try {
      const res = await fetch(`/api/pay/${token}/order`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice, details: locked ? undefined : d }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Could not start the payment.'); setBusy(false); return; }
      if (!(await loadCheckout()) || !rzp()) { setError('Could not load the payment window. Please try again.'); setBusy(false); return; }
      new (rzp()!)({
        key: j.keyId, order_id: j.orderId, amount: j.amount, currency: j.currency,
        name: 'YAFT Designs', description: 'Course payment',
        prefill: { name: j.name, email: j.email }, theme: { color: '#E63946' },
        handler: () => { setDone(true); setBusy(false); },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch {
      setError('Something went wrong. Please try again.'); setBusy(false);
    }
  }

  if (done) return <p><strong>Payment received. Thank you.</strong> Your tax invoice will be emailed to you in a few minutes.</p>;
  return (
    <div>
      {locked ? (
        <p style={{ fontSize: 13, opacity: 0.75, marginBottom: 16 }}>
          Billing to: {d.client_company || d.client_name}{d.client_gst ? `, GSTIN ${d.client_gst}` : ''}{d.client_pan ? `, PAN ${d.client_pan}` : ''}, {d.client_state}. These details are locked because your first bill is issued. To change them, email {CONTACT_EMAIL}.
        </p>
      ) : (
        <BillingForm d={d} set={set} disabled={busy} allowOutsideIndia={outsideOk} />
      )}
      {options.map((o, i) => (
        <button key={o.choice} className={i === 0 ? 'btn-primary' : 'btn-secondary'} style={{ marginRight: 10, marginBottom: 8 }} onClick={() => pay(o.choice)} disabled={busy}>
          {busy ? 'Please wait...' : `${o.label}: ₹${fmtFixed2(o.amount)}${o.usd ? ` (about US$${o.usd})` : ''}`}
        </button>
      ))}
      {error && <p role="alert" style={{ color: '#e55', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
