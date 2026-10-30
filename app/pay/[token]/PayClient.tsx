'use client';

import { useState } from 'react';
import { fmtFixed2 } from '@/lib/format';

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

type Option = { choice: string; label: string; amount: number };

export default function PayClient({ token, options }: { token: string; options: Option[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function pay(choice: string) {
    setError(''); setBusy(true);
    try {
      const res = await fetch(`/api/pay/${token}/order`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ choice }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? 'Could not start the payment.'); setBusy(false); return; }
      if (!(await loadCheckout()) || !rzp()) { setError('Could not load the payment window. Please try again.'); setBusy(false); return; }
      new (rzp()!)({
        key: d.keyId, order_id: d.orderId, amount: d.amount, currency: d.currency,
        name: 'YAFT Designs', description: `Course ${d.kind}`,
        prefill: { name: d.name, email: d.email }, theme: { color: '#1f3a5f' },
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
      {options.map((o, i) => (
        <button key={o.choice} className={i === 0 ? 'btn-primary' : 'btn-secondary'} style={{ marginRight: 10, marginBottom: 8 }} onClick={() => pay(o.choice)} disabled={busy}>
          {busy ? 'Please wait...' : `${o.label}: ₹${fmtFixed2(o.amount)}`}
        </button>
      ))}
      {error && <p style={{ color: '#e55', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
