'use client';

import { useState } from 'react';
import { priceFor, formatMinor, MAX_QUANTITY, type Currency } from '@/lib/tortoisePricing';
import { INDIAN_STATES } from '@/lib/indianStates';
import styles from '@/app/tortoise/tortoise.module.css';

type RazorpayHandlerResponse = { razorpay_payment_id: string };
type RazorpayOptions = {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string;
  prefill: { name: string; email: string };
  handler: (r: RazorpayHandlerResponse) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};
declare global {
  interface Window { Razorpay?: new (o: RazorpayOptions) => { open: () => void } }
}

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function guessCurrency(): Currency {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Asia/Calcutta') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Asia/Kolkata')
      ? 'INR' : 'USD';
  } catch {
    return 'USD';
  }
}

export default function TortoiseBuy() {
  const [currency, setCurrency] = useState<Currency>(guessCurrency);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState('');
  const [gstin, setGstin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);

  const price = priceFor(currency, quantity);

  async function buy(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/tortoise/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, quantity, currency, state, gstin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Could not start the payment.'); return; }
      if (!(await loadCheckout()) || !window.Razorpay) { setError('Could not load the payment window. Please try again.'); return; }
      new window.Razorpay({
        key: data.keyId, order_id: data.orderId, amount: data.amount, currency: data.currency,
        name: 'YAFT Designs', description: `Tortoise licence x ${quantity}`,
        prefill: { name, email },
        theme: { color: '#1f3a5f' },
        handler: () => setPaid(true),
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch {
      setError('Something went wrong. Please try again or email yaftdesigns@gmail.com.');
    } finally {
      setBusy(false);
    }
  }

  if (paid) {
    return (
      <div className={styles.buy}>
        <p><strong>Payment received, thank you.</strong> Your licence key and tax invoice will be emailed to {email} shortly. If you do not see it within a day, email yaftdesigns@gmail.com.</p>
      </div>
    );
  }

  return (
    <form className={styles.buy} onSubmit={buy}>
      <div className={styles.row}>
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" /></label>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" /></label>
      </div>
      <div className={styles.row}>
        <label>Licence keys
          <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
            {Array.from({ length: MAX_QUANTITY }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Pay in
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="INR">INR (India, GST included)</option>
            <option value="USD">USD (international)</option>
          </select>
        </label>
      </div>
      {currency === 'INR' && (
        <div className={styles.row}>
          <label>State (for the GST invoice)
            <select value={state} onChange={(e) => setState(e.target.value)} required>
              <option value="">Select your state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>GSTIN (optional)
            <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} maxLength={15} placeholder="Only if you want it on the invoice" />
          </label>
        </div>
      )}
      <p className={styles.small}>
        {currency === 'INR'
          ? `Base ${formatMinor(price.base, 'INR')} + GST 18% ${formatMinor(price.gst, 'INR')} = `
          : ''}
        <strong>Total {formatMinor(price.total, currency)}</strong>. One-time, never expires. Each key works on up to 2 PCs.
      </p>
      {error && <p className={styles.err}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Buy now'}</button>
    </form>
  );
}
