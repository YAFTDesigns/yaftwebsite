'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';
import { INDIAN_STATES } from '@/lib/indianStates';
import { computeSchedule } from '@/lib/coursePayments';
import { fmtFixed2 } from '@/lib/format';

type Pay = { kind: 'advance' | 'balance'; paid_at: string | null; payment_id: string | null; fulfilled: boolean };
type Plan = {
  id: string; token: string; created_at: string; client_name: string; client_email: string; description: string;
  base_total: number; advance_base: number; status: string; invoice_no: string | null; payments: Pay[];
};

const field = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 10px', fontSize: 14, width: '100%' } as const;
const btn = { ...field, width: 'auto', cursor: 'pointer', marginRight: 6 } as const;
const empty = { client_name: '', client_email: '', client_phone: '', client_type: 'individual', client_company: '', client_gst: '', client_state: 'Tamil Nadu', description: '', base_total: '', advance_base: '' };

export default function PaymentPlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    fetch('/api/admin/payment-plans').then((r) => r.json()).then((j) => { if (live) setPlans(j.data ?? []); }).catch(() => { if (live) setError('Could not load plans'); });
    return () => { live = false; };
  }, [tick]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  let preview = '';
  try {
    const s = computeSchedule(Number(form.base_total), Number(form.advance_base));
    preview = `Advance ₹${fmtFixed2(s.advance.base)} + GST ₹${fmtFixed2(s.advance.gst)} = ₹${fmtFixed2(s.advance.total)}  |  Balance ₹${fmtFixed2(s.balance.base)} + GST ₹${fmtFixed2(s.balance.gst)} = ₹${fmtFixed2(s.balance.total)}  |  Total ₹${fmtFixed2(s.total.total)}`;
  } catch { /* incomplete form */ }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    const res = await fetch('/api/admin/payment-plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, base_total: Number(form.base_total), advance_base: Number(form.advance_base) }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.error ?? 'Could not create'); return; }
    setForm(empty); setNotice('Plan created. Copy its link below and send it to the client.'); setTick((t) => t + 1);
  }

  const link = (t: string) => `${window.location.origin}/pay/${t}`;
  async function copy(t: string) { try { await navigator.clipboard.writeText(link(t)); setNotice('Link copied.'); } catch { setNotice(link(t)); } }
  async function cancel(id: string) {
    if (!confirm('Stop this link working? Payments already made and invoices stay on record.')) return;
    await fetch('/api/admin/payment-plans', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action: 'cancel' }) });
    setTick((t) => t + 1);
  }

  const paidOf = (p: Plan, k: string) => p.payments.find((x) => x.kind === k);
  return (
    <>
      <h1 className={styles.sectionTitle}>Course payment plans</h1>
      <p style={{ marginBottom: 16, opacity: 0.7, fontSize: 13 }}>Create a plan, send the client the link. They pay the advance on the site, the invoice is emailed and saved under Invoices automatically. When the balance is due, send the same link again.</p>
      {error && <p style={{ color: '#e55', marginBottom: 12 }}>{error}</p>}
      {notice && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{notice}</p>}

      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 10 }}>
        <input style={field} placeholder="Client name" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} required />
        <input style={field} type="email" placeholder="Client email" value={form.client_email} onChange={(e) => set('client_email', e.target.value)} required />
        <input style={field} placeholder="Phone (optional)" value={form.client_phone} onChange={(e) => set('client_phone', e.target.value)} />
        <select style={field} value={form.client_type} onChange={(e) => set('client_type', e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select>
        {form.client_type === 'company' && <input style={field} placeholder="Company name" value={form.client_company} onChange={(e) => set('client_company', e.target.value)} required />}
        <input style={field} placeholder="GSTIN (optional)" value={form.client_gst} onChange={(e) => set('client_gst', e.target.value)} />
        <select style={field} value={form.client_state} onChange={(e) => set('client_state', e.target.value)}>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
        <input style={field} placeholder="Course (shown on invoice)" value={form.description} onChange={(e) => set('description', e.target.value)} required />
        <input style={field} type="number" min={1} step={1} placeholder="Full fee, base rupees (no GST)" value={form.base_total} onChange={(e) => set('base_total', e.target.value)} required />
        <input style={field} type="number" min={1} step={1} placeholder="Advance, base rupees (no GST)" value={form.advance_base} onChange={(e) => set('advance_base', e.target.value)} required />
        <button style={btn} disabled={busy}>{busy ? 'Creating...' : 'Create plan'}</button>
      </form>
      {preview && <p style={{ fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 24 }}>{preview}</p>}

      <table className={styles.table}>
        <thead><tr><th>Client</th><th>Course</th><th>Fee (base)</th><th>Advance</th><th>Balance</th><th>Invoice</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>{p.client_name}<div style={{ opacity: 0.6, fontSize: 12 }}>{p.client_email}</div></td>
              <td>{p.description}</td>
              <td>₹{fmtFixed2(p.base_total)} (adv ₹{fmtFixed2(p.advance_base)})</td>
              <td>{paidOf(p, 'advance') ? `Paid ${paidOf(p, 'advance')!.paid_at ? new Date(paidOf(p, 'advance')!.paid_at!).toLocaleDateString('en-GB') : ''}` : 'Pending'}</td>
              <td>{paidOf(p, 'balance') ? `Paid ${paidOf(p, 'balance')!.paid_at ? new Date(paidOf(p, 'balance')!.paid_at!).toLocaleDateString('en-GB') : ''}` : 'Pending'}</td>
              <td>{p.invoice_no ?? '—'}</td>
              <td>{p.status}</td>
              <td>{p.status === 'active' && <><button style={btn} onClick={() => copy(p.token)}>Copy link</button><button style={btn} onClick={() => cancel(p.id)}>Cancel</button></>}</td>
            </tr>
          ))}
          {plans.length === 0 && <tr><td colSpan={8}>No plans yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
