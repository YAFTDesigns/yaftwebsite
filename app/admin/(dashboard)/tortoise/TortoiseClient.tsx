'use client';

import { useEffect, useState } from 'react';
import styles from '../admin.module.css';

type Lic = {
  key: string; email: string; note: string | null; status: 'active' | 'revoked';
  expires_at: string | null; max_machines: number; created_at: string;
  machines: number; last_seen: string | null;
};

const field = { background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '8px 10px', fontSize: 14 } as const;
const btn = { ...field, cursor: 'pointer', marginRight: 6 } as const;

type Sale = {
  payment_id: string; email: string; name: string | null; amount: number; currency: string; quantity: number;
  license_keys: string[]; customer_emailed: boolean; created_at: string; invoice_no: string | null;
  buyer_state: string | null; buyer_gstin: string | null; test_mode: boolean;
};

function money(minor: number, cur: string) {
  const v = (minor / 100).toLocaleString(cur === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cur === 'INR' ? '₹' : 'US$'}${v}`;
}

function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString('en-GB') : '—'; }
function state(l: Lic) {
  if (l.status === 'revoked') return 'Revoked';
  if (l.expires_at && new Date(l.expires_at) < new Date()) return 'Expired';
  return 'Active';
}

export default function TortoiseClient() {
  const [rows, setRows] = useState<Lic[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [form, setForm] = useState({ email: '', months: 0, max_machines: 2, note: '' });

  const [tab, setTab] = useState<'licences' | 'sales'>('licences');
  const [sales, setSales] = useState<Sale[]>([]);
  const [notice, setNotice] = useState('');
  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    let live = true;
    fetch('/api/admin/tortoise')
      .then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }))
      .then(({ ok, json }) => {
        if (!live) return;
        if (!ok) { setError(json.error ?? 'Could not load licences'); return; }
        setError('');
        setRows(json.data ?? []);
      })
      .catch(() => { if (live) setError('Could not load licences'); });
    fetch('/api/admin/tortoise?view=sales')
      .then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }))
      .then(({ ok, json }) => { if (live && ok) setSales(json.data ?? []); })
      .catch(() => {});
    return () => { live = false; };
  }, [tick]);

  async function resend(p: Sale) {
    if (!confirm(`Email the key${p.license_keys.length > 1 ? 's' : ''}${p.invoice_no ? ' and invoice ' + p.invoice_no : ''} to ${p.email}?`)) return;
    setNotice('Sending...');
    const res = await fetch('/api/admin/tortoise', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend_key_email', payment_id: p.payment_id }),
    });
    const json = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Sent to ${p.email}` : (json.error ?? 'Send failed'));
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setNewKey('');
    const res = await fetch('/api/admin/tortoise', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.error ?? 'Could not create key'); return; }
    setNewKey(json.key); setError('');
    setForm({ ...form, email: '', note: '' });
    load();
  }

  async function act(key: string, action: string, months?: number) {
    if (action === 'revoke' && !confirm(`Revoke ${key}? The plugin drops the licence on its next check.`)) return;
    if (action === 'reset' && !confirm(`Clear all PCs for ${key}? It can then be activated on new PCs.`)) return;
    const res = await fetch('/api/admin/tortoise', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, action, months }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? 'Update failed');
    load();
  }

  return (
    <>
      <h1 className={styles.sectionTitle}>Tortoise {tab === 'licences' ? `licences (${rows.length})` : `sales (${sales.length})`}</h1>
      <div style={{ marginBottom: 16 }}>
        <button style={{ ...btn, fontWeight: tab === 'licences' ? 700 : 400 }} onClick={() => setTab('licences')}>Licences</button>
        <button style={{ ...btn, fontWeight: tab === 'sales' ? 700 : 400 }} onClick={() => setTab('sales')}>Sales</button>
      </div>
      {notice && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 12 }}>{notice}</p>}

      {error && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#e55', marginBottom: 16 }}>{error}</p>}

      {tab === 'sales' && (
        sales.length === 0 ? <p className={styles.empty}>No sales yet.</p> : (
          <table className={styles.table}>
            <thead>
              <tr><th>Date</th><th>Buyer</th><th>State</th><th>Paid</th><th>Keys</th><th>Invoice</th><th>Key emailed</th><th></th></tr>
            </thead>
            <tbody>
              {sales.map((p) => (
                <tr key={p.payment_id}>
                  <td>{fmtDate(p.created_at)}{p.test_mode ? ' (TEST)' : ''}</td>
                  <td>{p.name ?? '—'}<br />{p.email}{p.buyer_gstin ? <><br />GSTIN {p.buyer_gstin}</> : null}</td>
                  <td>{p.buyer_state ?? '—'}</td>
                  <td>{money(p.amount, p.currency)}<br />x{p.quantity}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.license_keys.map((k) => <div key={k}>{k}</div>)}</td>
                  <td>{p.invoice_no ?? (p.currency === 'INR' ? 'Missing' : 'Manual (USD)')}</td>
                  <td>{p.customer_emailed ? 'Yes' : 'No'}</td>
                  <td><button style={btn} onClick={() => resend(p)}>{p.customer_emailed ? 'Resend' : 'Send key'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'licences' && (<>
      <form onSubmit={create} className={styles.panel}>
        <h2 className={styles.panelTitle}>New key</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>Buyer email<br /><input required type="email" style={{ ...field, width: 240 }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Months (0 = perpetual)<br /><input type="number" min={0} max={120} style={{ ...field, width: 110 }} value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} /></label>
          <label>PCs<br /><input type="number" min={1} max={50} style={{ ...field, width: 70 }} value={form.max_machines} onChange={(e) => setForm({ ...form, max_machines: Number(e.target.value) })} /></label>
          <label>Note<br /><input style={{ ...field, width: 200 }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="invoice no, company" /></label>
          <button type="submit" disabled={busy} style={btn}>{busy ? 'Creating...' : 'Create key'}</button>
        </div>
        {newKey && (
          <p style={{ marginTop: 16, fontFamily: 'var(--mono)' }}>
            New key: <strong>{newKey}</strong> <button type="button" style={btn} onClick={() => navigator.clipboard.writeText(newKey)}>Copy</button>
          </p>
        )}
      </form>

      {rows.length === 0 ? (
        <p className={styles.empty}>No keys yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Key</th><th>Email</th><th>Status</th><th>Expires</th><th>PCs</th><th>Last seen</th><th>Note</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.key}>
                <td style={{ fontFamily: 'var(--mono)' }}>{l.key}</td>
                <td>{l.email}</td>
                <td>{state(l)}</td>
                <td>{l.expires_at ? fmtDate(l.expires_at) : 'Never'}</td>
                <td>{l.machines} / {l.max_machines}</td>
                <td>{fmtDate(l.last_seen)}</td>
                <td>{l.note ?? '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {l.status === 'active'
                    ? <button style={btn} onClick={() => act(l.key, 'revoke')}>Revoke</button>
                    : <button style={btn} onClick={() => act(l.key, 'restore')}>Restore</button>}
                  {l.expires_at && <button style={btn} onClick={() => act(l.key, 'extend', 12)}>+12 mo</button>}
                  <button style={btn} onClick={() => act(l.key, 'reset')}>Reset PCs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </>)}
    </>
  );
}
