'use client';

import { useState } from 'react';
import BillingForm, { type Details } from '@/components/BillingForm';
import { fmtFixed2 } from '@/lib/format';
import { usdMinorFor } from '@/lib/fx';
import { computeSchedule } from '@/lib/coursePayments';
import { advanceFor } from '@/lib/courseCatalog';
import { applyCombos } from '@/lib/courseCombos';

type Item = { key: string; kind: 'course' | 'bundle'; title: string; feeInr: number; courseSlugs: string[]; description: string };
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
    s.onload = () => resolve(true); s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const blank: Details = { client_name: '', client_email: '', client_phone: '', client_type: 'individual', client_company: '', client_gst: '', client_pan: '', client_address: '', client_state: '' };

export default function EnrollClient({ items, fx, preselect }: { items: Item[]; fx: { inrPerUsd: number; bufferPercent: number } | null; preselect?: string }) {
  const [picked, setPicked] = useState<string[]>(() => (preselect && items.some((i) => i.key === `course:${preselect}`) ? [`course:${preselect}`] : []));
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [d, setD] = useState<Details>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosenRaw = items.filter((i) => picked.includes(i.key));
  const covered = new Set(chosenRaw.flatMap((i) => i.courseSlugs));
  const { items: chosen, applied } = applyCombos(chosenRaw, items);
  const baseTotal = chosen.reduce((s, i) => s + i.feeInr, 0);
  const sched = (() => { try { return baseTotal >= 2 ? computeSchedule(baseTotal, advanceFor(baseTotal)) : null; } catch { return null; } })();
  const usd = (inr: number) => (fx ? usdMinorFor(inr, fx.inrPerUsd, fx.bufferPercent) / 100 : null);

  const set = (k: keyof Details, v: string) => setD((x) => ({ ...x, [k]: v }));
  const toggle = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  // A combo is not a separate thing to buy: it is the discount applied when all its courses are picked. Ticking it ticks those courses.
  const comboKeys = (i: Item) => i.courseSlugs.map((slug) => `course:${slug}`);
  const comboOn = (i: Item) => comboKeys(i).every((k) => picked.includes(k));
  const toggleCombo = (i: Item) => setPicked((p) => (comboOn(i) ? p.filter((k) => !comboKeys(i).includes(k)) : [...new Set([...p, ...comboKeys(i)])]));
  // Short, clean summary for checkout: cut at a word boundary with a proper ellipsis, never mid-word.
  const brief = (t: string) => { const x = t.trim(); if (x.length <= 140) return x; const cut = x.slice(0, 140).replace(/\s+\S*$/, ''); return `${cut}…`; };
  function chooseCurrency(c: 'INR' | 'USD') { setCurrency(c); set('client_state', c === 'USD' ? 'Outside India' : ''); }
  const blocked = (i: Item) => !picked.includes(i.key) && i.courseSlugs.some((s) => covered.has(s));

  async function pay(choice: 'advance' | 'full') {
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/enroll/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: picked, currency, choice, details: d }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? 'Could not start the payment.'); setBusy(false); return; }
      if (!(await loadCheckout()) || !rzp()) { setError('Could not load the payment window. Please try again.'); setBusy(false); return; }
      new (rzp()!)({
        key: j.keyId, order_id: j.orderId, amount: j.amount, currency: j.currency, name: 'YAFT Designs', description: 'Course enrolment',
        prefill: { name: j.name, email: j.email }, theme: { color: '#1f3a5f' },
        handler: () => { window.location.href = `/pay/${j.token}`; },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch { setError('Something went wrong. Please try again.'); setBusy(false); }
  }

  const money = (inr: number) => `₹${fmtFixed2(inr)}${currency === 'USD' && usd(inr) ? ` (about US$${usd(inr)})` : ''}`;

  return (
    <div>
      <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 18 }}>
        <legend style={{ padding: '0 6px', fontSize: 13 }}>1. Choose your course(s)</legend>
        {items.map((i) => (
          <label key={i.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)', opacity: i.kind === 'course' && blocked(i) ? 0.45 : 1 }}>
            <input type="checkbox" checked={i.kind === 'bundle' ? comboOn(i) : picked.includes(i.key)} disabled={i.kind === 'course' && blocked(i)} onChange={() => (i.kind === 'bundle' ? toggleCombo(i) : toggle(i.key))} style={{ marginTop: 4 }} />
            <span style={{ flex: 1 }}>
              <strong>{i.title}</strong>{i.kind === 'bundle' && <span style={{ marginLeft: 8, fontSize: 11, border: '1px solid var(--brass)', color: 'var(--brass)', borderRadius: 4, padding: '1px 6px' }}>COMBO</span>}
              {i.kind === 'bundle' && <span style={{ display: 'block', fontSize: 12, opacity: 0.75 }}>Applied automatically when you select all of these courses.</span>}
              {i.description && <span style={{ display: 'block', fontSize: 13, opacity: 0.75 }}>{brief(i.description)}</span>}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>₹{fmtFixed2(i.feeInr)} <span style={{ fontSize: 11, opacity: 0.7 }}>+ GST</span></span>
          </label>
        ))}
      </fieldset>

      {fx && (
        <div style={{ marginBottom: 18, fontSize: 14 }}>
          Pay in:{' '}
          <button type="button" className={currency === 'INR' ? 'btn-primary' : 'btn-secondary'} onClick={() => chooseCurrency('INR')} style={{ marginRight: 8 }}>INR</button>
          <button type="button" className={currency === 'USD' ? 'btn-primary' : 'btn-secondary'} onClick={() => chooseCurrency('USD')}>USD</button>
          {currency === 'USD' && <span style={{ display: 'block', fontSize: 12, opacity: 0.7, marginTop: 6 }}>US$ is worked out from the live exchange rate when you press Pay and is fixed for that payment. Your tax invoice is issued in INR.</span>}
        </div>
      )}

      {applied.length > 0 && (
        <p style={{ marginBottom: 14, fontSize: 14, color: 'var(--brass)' }}>
          {applied.map((a) => `Combo applied: ${a.title}, you save ₹${fmtFixed2(a.saving)} (before GST).`).join(' ')}
        </p>
      )}

      {sched && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 18, fontSize: 14, lineHeight: 1.9 }}>
          <div>Course fee: <strong>₹{fmtFixed2(sched.total.base)}</strong></div>
          <div>GST 18%: <strong>₹{fmtFixed2(sched.total.gst)}</strong></div>
          <div>Total: <strong>{money(sched.total.total)}</strong></div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '8px 0' }} />
          <div>Pay half now: ₹{fmtFixed2(sched.advance!.base)} + GST ₹{fmtFixed2(sched.advance!.gst)} = <strong>{money(sched.advance!.total)}</strong></div>
          <div>Second half later: ₹{fmtFixed2(sched.balance!.base)} + GST ₹{fmtFixed2(sched.balance!.gst)} = <strong>{money(sched.balance!.total)}</strong> (the link is shown after your first payment)</div>
        </div>
      )}

      <BillingForm d={d} set={set} disabled={busy} allowOutsideIndia={currency === 'USD'} />
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 14 }}>Individual enrolment. Company or team training is arranged by email (see below).</p>

      <button className="btn-primary" style={{ marginRight: 10, marginBottom: 8 }} disabled={busy || !sched} onClick={() => pay('advance')}>{busy ? 'Please wait...' : 'Pay 50% now'}</button>
      <button className="btn-secondary" style={{ marginBottom: 8 }} disabled={busy || !sched} onClick={() => pay('full')}>{busy ? 'Please wait...' : 'Pay full amount'}</button>
      {error && <p role="alert" style={{ color: '#e55', marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 20 }}>
        By paying you agree to our <a href="/terms" style={{ textDecoration: 'underline' }}>terms</a>. Your details are used only for your enrolment and tax invoice (<a href="/privacy" style={{ textDecoration: 'underline' }}>privacy</a>). Secure payment by Razorpay.
      </p>
    </div>
  );
}
