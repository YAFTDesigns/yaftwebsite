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

export default function PayClient({ token, label, amount }: { token: string; label: string; amount: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function pay() {
    setError(''); setBusy(true);
    try {
      const res = await fetch(`/api/pay/${token}/order`, { method: 'POST' });
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
      <button className="btn-primary" onClick={pay} disabled={busy}>{busy ? 'Please wait...' : `${label}: ₹${fmtFixed2(amount)}`}</button>
      {error && <p style={{ color: '#e55', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
