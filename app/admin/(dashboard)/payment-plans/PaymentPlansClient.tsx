'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';
import { INDIAN_STATES } from '@/lib/indianStates';
import { computeSchedule } from '@/lib/coursePayments';
import { fmtFixed2 } from '@/lib/format';

type Pay = {
  id: string; kind: 'advance' | 'balance' | 'full'; paid_at: string | null; payment_id: string | null; amount_minor: number;
  invoice_no: string | null; invoice_emailed: boolean; sync_status: string; sync_error: string | null; sync_attempts: number;
  gateway_fee_minor: number | null; gateway_tax_minor: number | null; test_mode: boolean;
};
type Plan = {
  id: string; token: string; created_at: string; client_name: string; client_email: string; description: string; structure: 'instalments' | 'full';
  base_total: number; advance_base: number | null; status: string; is_test: boolean; payments: Pay[];
};
type Adj = { id: string; plan_id: string; refund_minor: number; status: string; credit_note_no: string | null; issued_date: string | null; total: number | null; reason: string | null; is_test: boolean };
type Mismatch = { severity: 'high' | 'medium'; where: string; message: string };

const field = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 10px', fontSize: 14, width: '100%' } as const;
const btn = { ...field, width: 'auto', cursor: 'pointer', marginRight: 6 } as const;
const h2 = { fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', margin: '28px 0 10px' } as const;
const empty = { client_name: '', client_email: '', client_phone: '', client_type: 'individual', client_company: '', client_gst: '', client_state: 'Tamil Nadu', description: '', base_total: '', advance_base: '' };
const inr = (minor: number) => `₹${fmtFixed2(minor / 100)}`;
const fmtD = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : '');

export default function PaymentPlansClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [adjs, setAdjs] = useState<Adj[]>([]);
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    let live = true;
    fetch('/api/admin/payment-plans').then((r) => r.json()).then((j) => {
      if (!live) return;
      setPlans(j.data ?? []); setAdjs(j.adjustments ?? []); setMismatches(j.mismatches ?? []); setTestMode(!!j.testMode);
    }).catch(() => { if (live) setError('Could not load plans'); });
    return () => { live = false; };
  }, [tick]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));
  let preview = '';
  try {
    const s = computeSchedule(Number(form.base_total), form.advance_base === '' ? null : Number(form.advance_base));
    preview = s.structure === 'full'
      ? `One bill: ₹${fmtFixed2(s.full!.base)} + GST ₹${fmtFixed2(s.full!.gst)} = ₹${fmtFixed2(s.full!.total)}`
      : `Bill 1 (advance): ₹${fmtFixed2(s.advance!.base)} + GST ₹${fmtFixed2(s.advance!.gst)} = ₹${fmtFixed2(s.advance!.total)}  |  Bill 2 (balance): ₹${fmtFixed2(s.balance!.base)} + GST ₹${fmtFixed2(s.balance!.gst)} = ₹${fmtFixed2(s.balance!.total)}  |  Total ₹${fmtFixed2(s.total.total)}`;
  } catch { /* incomplete form */ }

  async function post(url: string, body: unknown, method = 'POST') {
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok, j };
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    const { ok, j } = await post('/api/admin/payment-plans', { ...form, base_total: Number(form.base_total), advance_base: form.advance_base === '' ? '' : Number(form.advance_base) });
    setBusy(false);
    if (!ok) { setError(j.error ?? 'Could not create'); return; }
    setForm(empty); setNotice('Plan created. Copy its link below and send it to the client.'); reload();
  }
  const link = (t: string) => `${window.location.origin}/pay/${t}`;
  async function copy(t: string) { try { await navigator.clipboard.writeText(link(t)); setNotice('Link copied.'); } catch { setNotice(link(t)); } }
  async function cancel(id: string) {
    if (!confirm('Stop this link working? Payments already made and bills stay on record.')) return;
    await post('/api/admin/payment-plans', { id, action: 'cancel' }, 'PATCH'); reload();
  }
  async function retry(id: string) {
    setError(''); setNotice('Retrying...');
    const { ok, j } = await post('/api/admin/payment-plans/retry', { payment_row_id: id });
    if (ok) setNotice(`Synced. Bill ${j.invoice_no ?? ''}`); else { setNotice(''); setError(j.error ?? 'Retry failed, see the status column'); }
    reload();
  }
  async function adjust(a: Adj, action: 'issue' | 'dismiss') {
    const reason = prompt(action === 'issue' ? 'Reason for the credit note (kept in the audit trail):' : 'Why dismiss this refund (no credit note)?');
    if (!reason) return;
    let amount: number | undefined;
    if (action === 'issue') {
      const v = prompt(`Credit note amount in rupees, GST included (refund was ${inr(a.refund_minor)}). Leave as is for the full refund:`, String(a.refund_minor / 100));
      if (!v) return; amount = Number(v);
    }
    const { ok, j } = await post('/api/admin/payment-plans/adjustments', { id: a.id, action, reason, amount });
    if (!ok) setError(j.error ?? 'Could not save'); else setNotice(action === 'issue' ? `Credit note ${j.credit_note_no} issued.` : 'Dismissed.');
    reload();
  }

  const planName = (id: string) => plans.find((p) => p.id === id)?.client_name ?? '';
  const pay = (p: Plan, k: string) => p.payments.find((x) => x.kind === k);
  const kinds = (p: Plan) => (p.structure === 'full' ? ['full'] : ['advance', 'balance']);
  const syncColor = (s: string) => (s === 'ok' ? '#4caf50' : s === 'pending' ? '#ffb300' : '#e55');

  return (
    <>
      <h1 className={styles.sectionTitle}>Course payment plans</h1>
      <p style={{ marginBottom: 8, opacity: 0.7, fontSize: 13 }}>Each payment gets its own numbered tax bill, emailed to the client and saved under Invoices, so it flows into the Financial Year Report. Leave the advance blank for a one-time full payment.</p>
      <p style={{ marginBottom: 16, fontFamily: 'var(--mono)', fontSize: 12, color: testMode ? '#ffb300' : '#4caf50' }}>Razorpay mode: {testMode ? 'TEST (bills are numbered YAFT-TEST and never count in reports)' : 'LIVE'}</p>
      {error && <p style={{ color: '#e55', marginBottom: 12 }}>{error}</p>}
      {notice && <p style={{ color: 'var(--brass)', marginBottom: 12 }}>{notice}</p>}

      {mismatches.length > 0 && (
        <div style={{ border: '1px solid #5a1a1a', background: '#2a0a0a', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#e55', marginBottom: 6 }}>Needs review ({mismatches.length})</p>
          <ul style={{ fontSize: 13, paddingLeft: 18, lineHeight: 1.7 }}>{mismatches.map((m, i) => <li key={i}><strong>{m.where}</strong>: {m.message}</li>)}</ul>
        </div>
      )}

      <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 10 }}>
        <input style={field} placeholder="Client name" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} required />
        <input style={field} type="email" placeholder="Client email" value={form.client_email} onChange={(e) => set('client_email', e.target.value)} required />
        <input style={field} placeholder="Phone (optional)" value={form.client_phone} onChange={(e) => set('client_phone', e.target.value)} />
        <select style={field} value={form.client_type} onChange={(e) => set('client_type', e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select>
        {form.client_type === 'company' && <input style={field} placeholder="Company name" value={form.client_company} onChange={(e) => set('client_company', e.target.value)} required />}
        <input style={field} placeholder="GSTIN (optional)" value={form.client_gst} onChange={(e) => set('client_gst', e.target.value)} />
        <select style={field} value={form.client_state} onChange={(e) => set('client_state', e.target.value)}>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
        <input style={field} placeholder="Course (shown on the bills)" value={form.description} onChange={(e) => set('description', e.target.value)} required />
        <input style={field} type="number" min={1} step={1} placeholder="Full fee, base rupees (no GST)" value={form.base_total} onChange={(e) => set('base_total', e.target.value)} required />
        <input style={field} type="number" min={1} step={1} placeholder="Advance, base rupees (blank = full payment)" value={form.advance_base} onChange={(e) => set('advance_base', e.target.value)} />
        <button style={btn} disabled={busy}>{busy ? 'Creating...' : 'Create plan'}</button>
      </form>
      {preview && <p style={{ fontSize: 12, fontFamily: 'var(--mono)', marginBottom: 8 }}>{preview}</p>}

      <h2 style={h2}>Plans and bills</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead><tr><th>Client</th><th>Course</th><th>Fee (base)</th><th>Bill / payment</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.client_name}<div style={{ opacity: 0.6, fontSize: 12 }}>{p.client_email}</div>{p.is_test && <div style={{ color: '#ffb300', fontSize: 11 }}>TEST</div>}</td>
                <td>{p.description}</td>
                <td>₹{fmtFixed2(p.base_total)}{p.advance_base ? <div style={{ opacity: 0.6, fontSize: 12 }}>advance ₹{fmtFixed2(p.advance_base)}</div> : <div style={{ opacity: 0.6, fontSize: 12 }}>full payment</div>}</td>
                <td>
                  {kinds(p).map((k) => {
                    const x = pay(p, k);
                    return (
                      <div key={k} style={{ marginBottom: 8, fontSize: 13 }}>
                        <strong style={{ textTransform: 'capitalize' }}>{k}</strong>: {x ? <>
                          {inr(x.amount_minor)} paid {fmtD(x.paid_at)}<br />
                          Bill {x.invoice_no ?? '—'}{x.invoice_emailed ? ', emailed' : ', not emailed'}<br />
                          <span style={{ opacity: 0.6, fontSize: 11 }}>{x.payment_id}{x.gateway_fee_minor != null ? ` | Razorpay fee ${inr(x.gateway_fee_minor + (x.gateway_tax_minor ?? 0))} (not in revenue)` : ''}</span><br />
                          <span style={{ color: syncColor(x.sync_status) }}>Sync: {x.sync_status}</span>{x.sync_error ? <span style={{ color: '#e55' }}> ({x.sync_error})</span> : null}
                          {x.sync_status !== 'ok' && <button style={{ ...btn, marginLeft: 8, padding: '3px 8px', fontSize: 12 }} onClick={() => retry(x.id)}>Retry</button>}
                        </> : <span style={{ opacity: 0.6 }}>{k === 'balance' && !pay(p, 'advance') ? 'locked until advance is paid' : 'not paid yet'}</span>}
                      </div>
                    );
                  })}
                </td>
                <td>{p.status}</td>
                <td>{p.status === 'active' && <><button style={btn} onClick={() => copy(p.token)}>Copy link</button><button style={btn} onClick={() => cancel(p.id)}>Cancel</button></>}</td>
              </tr>
            ))}
            {plans.length === 0 && <tr><td colSpan={6}>No plans yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={h2}>Refunds and credit notes</h2>
      <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>A refund made in Razorpay shows up here. It changes the Financial Year Report only once you issue a credit note, which counts in the year it is issued.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead><tr><th>Client</th><th>Refunded</th><th>Status</th><th>Credit note</th><th></th></tr></thead>
          <tbody>
            {adjs.map((a) => (
              <tr key={a.id}>
                <td>{planName(a.plan_id)}{a.is_test && <span style={{ color: '#ffb300', fontSize: 11 }}> TEST</span>}</td>
                <td>{inr(a.refund_minor)}</td>
                <td>{a.status === 'needs_review' ? 'Needs review' : a.status}</td>
                <td>{a.credit_note_no ? `${a.credit_note_no} · ${a.issued_date} · ₹${fmtFixed2(Number(a.total))}` : '—'}{a.reason ? <div style={{ opacity: 0.6, fontSize: 12 }}>{a.reason}</div> : null}</td>
                <td>{a.status === 'needs_review' && <><button style={btn} onClick={() => adjust(a, 'issue')}>Issue credit note</button><button style={btn} onClick={() => adjust(a, 'dismiss')}>Dismiss</button></>}</td>
              </tr>
            ))}
            {adjs.length === 0 && <tr><td colSpan={5}>No refunds.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
