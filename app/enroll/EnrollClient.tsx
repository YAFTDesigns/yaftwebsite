'use client';

import { useState } from 'react';
import BillingForm, { type Details } from '@/components/BillingForm';
import { fmtFixed2 } from '@/lib/format';
import { usdMinorFor } from '@/lib/fx';
import { computeSchedule } from '@/lib/coursePayments';
import { advanceFor } from '@/lib/courseCatalog';
import { applyCombos } from '@/lib/courseCombos';

type Item = { key: string; kind: 'course' | 'bundle'; title: string; feeInr: number; courseSlugs: string[]; description: string; image?: string; tool?: string; level?: string; duration?: string };
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
      <section className="enrol-catalog" aria-labelledby="course-picker-title">
        <div className="enrol-catalog-head">
          <div>
            <div className="eyebrow">01 · CHOOSE YOUR PATH</div>
            <h2 id="course-picker-title">Pick the course that matches where you want to go next.</h2>
          </div>
          <p>Select one course or build a pathway. If an eligible combo is cheaper, YAFT applies it automatically.</p>
        </div>

        <div className="enrol-course-grid">
          {items.map((i) => {
            const selected = i.kind === 'bundle' ? comboOn(i) : picked.includes(i.key);
            const disabled = i.kind === 'course' && blocked(i);
            const slug = i.courseSlugs[0] ?? '';
            const icon = slug.includes('revit') ? 'BIM' : slug.includes('climate') ? 'SUN' : slug.includes('wearables') ? '3D' : slug.includes('industrial') ? 'ID' : slug.includes('grasshopper') ? 'GH' : i.kind === 'bundle' ? 'R+G' : 'R3D';
            return (
              <label key={i.key} className={`enrol-course-card${selected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}${i.kind === 'bundle' ? ' is-combo' : ''}`}>
                <input className="enrol-course-check" type="checkbox" checked={selected} disabled={disabled} onChange={() => (i.kind === 'bundle' ? toggleCombo(i) : toggle(i.key))} />
                <span className="enrol-course-media" aria-hidden="true">
                  {i.image ? <img src={i.image} alt="" loading="lazy" /> : <span className="enrol-course-fallback">{icon}</span>}
                  <span className="enrol-course-shade" />
                  <span className="enrol-course-icon">{icon}</span>
                  {i.kind === 'bundle' && <span className="enrol-course-featured">Best pathway</span>}
                  {selected && <span className="enrol-course-selected">Selected ✓</span>}
                </span>
                <span className="enrol-course-body">
                  <span className="enrol-course-meta">
                    {i.tool && <span>{i.tool}</span>}
                    {i.duration && <span>{i.duration}</span>}
                    {i.level && <span>{i.level}</span>}
                  </span>
                  <strong className="enrol-course-title">{i.title}</strong>
                  {i.description && <span className="enrol-course-desc">{brief(i.description)}</span>}
                  <span className="enrol-course-bottom">
                    <span className="enrol-course-price">₹{fmtFixed2(i.feeInr)} <small>+ GST</small></span>
                    <span className="enrol-course-action">{selected ? 'Added to your plan' : disabled ? 'Included in selected combo' : 'Select course →'}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {fx && (
        <div className="enrol-currency" style={{ marginBottom: 18, fontSize: 14 }}>
          <span className="enrol-currency-label">Payment currency</span>
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
        <div className="pay-summary enrol-summary">
          <div className="enrol-summary-head">
            <div>
              <span className="pay-focus-kicker">YOUR SELECTION</span>
              <strong>{chosen.map((i) => i.title).join(' + ')}</strong>
            </div>
            <div className="enrol-summary-total">{money(sched.total.total)}</div>
          </div>
          <div className="enrol-summary-grid">
            <div><span>Course fee</span><strong>₹{fmtFixed2(sched.total.base)}</strong></div>
            <div><span>GST 18%</span><strong>₹{fmtFixed2(sched.total.gst)}</strong></div>
            <div><span>Pay now</span><strong>{money(sched.advance!.total)}</strong></div>
            <div><span>Later</span><strong>{money(sched.balance!.total)}</strong></div>
          </div>
          <p className="enrol-summary-note">You can pay 50% now and the balance later, or complete the full payment today. GST invoice is issued after payment.</p>
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
