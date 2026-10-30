'use client';

import { useState } from 'react';
import { fmtFixed2 } from '@/lib/format';
import { INDIAN_STATES } from '@/lib/indianStates';

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
type Details = { client_name: string; client_email: string; client_phone: string; client_type: 'individual' | 'company'; client_company: string; client_gst: string; client_pan: string; client_address: string; client_state: string };

const field = { width: '100%', padding: '10px 12px', fontSize: 15, background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 6 } as const;
const label = { display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 } as const;

export default function PayClient({ token, options, initial, locked }: { token: string; options: Option[]; initial: Details; locked: boolean }) {
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
        prefill: { name: j.name, email: j.email }, theme: { color: '#1f3a5f' },
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
          Billing to: {d.client_company || d.client_name}{d.client_gst ? `, GSTIN ${d.client_gst}` : ''}{d.client_pan ? `, PAN ${d.client_pan}` : ''}, {d.client_state}. These details are locked because your first bill is issued. To change them, email yaftdesigns@gmail.com.
        </p>
      ) : (
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 18 }} disabled={busy}>
          <legend style={{ padding: '0 6px', fontSize: 13 }}>Billing details for your tax invoice</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            <div><label style={label} htmlFor="b-type">Billing as</label>
              <select id="b-type" style={field} value={d.client_type} onChange={(e) => set('client_type', e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select></div>
            {d.client_type === 'company' && <div><label style={label} htmlFor="b-co">Company name</label><input id="b-co" style={field} value={d.client_company} onChange={(e) => set('client_company', e.target.value)} autoComplete="organization" /></div>}
            <div><label style={label} htmlFor="b-name">{d.client_type === 'company' ? 'Contact person' : 'Name on the bill'}</label><input id="b-name" style={field} value={d.client_name} onChange={(e) => set('client_name', e.target.value)} autoComplete="name" /></div>
            <div><label style={label} htmlFor="b-email">Email (bill is sent here)</label><input id="b-email" type="email" style={field} value={d.client_email} onChange={(e) => set('client_email', e.target.value)} autoComplete="email" /></div>
            <div><label style={label} htmlFor="b-phone">Phone (optional)</label><input id="b-phone" style={field} value={d.client_phone} onChange={(e) => set('client_phone', e.target.value)} autoComplete="tel" /></div>
            <div><label style={label} htmlFor="b-gst">GSTIN {d.client_type === 'company' ? '(GSTIN or PAN needed)' : '(optional)'}</label><input id="b-gst" style={field} value={d.client_gst} onChange={(e) => set('client_gst', e.target.value.toUpperCase())} maxLength={15} /></div>
            <div><label style={label} htmlFor="b-pan">PAN {d.client_type === 'company' ? '(GSTIN or PAN needed)' : '(optional)'}</label><input id="b-pan" style={field} value={d.client_pan} onChange={(e) => set('client_pan', e.target.value.toUpperCase())} maxLength={10} /></div>
            <div><label style={label} htmlFor="b-state">State (decides CGST+SGST or IGST)</label>
              <select id="b-state" style={field} value={d.client_state} onChange={(e) => set('client_state', e.target.value)}>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={{ marginTop: 12 }}><label style={label} htmlFor="b-addr">Billing address</label>
            <textarea id="b-addr" style={{ ...field, minHeight: 70 }} value={d.client_address} onChange={(e) => set('client_address', e.target.value)} autoComplete="street-address" /></div>
        </fieldset>
      )}
      {options.map((o, i) => (
        <button key={o.choice} className={i === 0 ? 'btn-primary' : 'btn-secondary'} style={{ marginRight: 10, marginBottom: 8 }} onClick={() => pay(o.choice)} disabled={busy}>
          {busy ? 'Please wait...' : `${o.label}: ₹${fmtFixed2(o.amount)}`}
        </button>
      ))}
      {error && <p role="alert" style={{ color: '#e55', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
