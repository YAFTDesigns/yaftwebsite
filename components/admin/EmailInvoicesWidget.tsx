'use client';

import { useState, useMemo } from 'react';
import { ddmmyyyyToIso, monthKey, monthLabel } from '@/lib/jobsGrouping';

type SelectableInvoice = { id: string; invoice_no: string; date: string; client_name: string; total: number };
type TeamOption = { id: string; name: string; email: string | null };

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Sits in the empty space beside the compact "Leads by source" pie
// chart on the admin Home page. Deliberately its own small feature
// rather than reusing /admin/invoices' existing "Email invoices to..."
// control: that one sends a whole month at once and still attaches
// proformas (on a separate sheet). This is scoped to real invoices
// only, with per-invoice checkboxes so a specific bill can be left
// out without waiting for month-end.
export default function EmailInvoicesWidget({
  invoices,
  accountants,
}: {
  invoices: SelectableInvoice[];
  accountants: TeamOption[];
}) {
  // invoices.date is DD/MM/YYYY free text (see lib/jobsGrouping.ts) --
  // always through ddmmyyyyToIso before any Date parsing, or DD/MM
  // silently misreads as MM/DD.
  const months = useMemo(() => {
    const keys = new Set(invoices.map(inv => monthKey(ddmmyyyyToIso(inv.date))));
    return Array.from(keys).sort().reverse();
  }, [invoices]);

  const [month, setMonth] = useState(months[0] ?? '');
  const invoicesForMonth = useMemo(
    () => invoices.filter(inv => monthKey(ddmmyyyyToIso(inv.date)) === month),
    [invoices, month]
  );

  // Default to everything in the selected month -- the common case is
  // "send this month's bills", deselecting the odd one is the
  // exception. Re-derives whenever the month changes rather than
  // carrying over a previous month's selection.
  const [selected, setSelected] = useState<Set<string>>(new Set(invoicesForMonth.map(i => i.id)));
  const [accountantId, setAccountantId] = useState(accountants.find(a => a.email)?.id ?? '');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  function changeMonth(m: string) {
    setMonth(m);
    setSelected(new Set(invoices.filter(inv => monthKey(ddmmyyyyToIso(inv.date)) === m).map(i => i.id)));
    setStatus('idle');
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(prev => prev.size === invoicesForMonth.length ? new Set() : new Set(invoicesForMonth.map(i => i.id)));
  }

  const accountant = accountants.find(a => a.id === accountantId);
  const selectedTotal = invoicesForMonth.filter(i => selected.has(i.id)).reduce((s, i) => s + Number(i.total), 0);

  async function send() {
    if (selected.size === 0) { setError('Select at least one invoice.'); setStatus('error'); return; }
    if (!accountant?.email) { setError('Pick an accountant with an email on file.'); setStatus('error'); return; }
    setStatus('sending'); setError('');
    try {
      const res = await fetch('/api/admin/invoices/email-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: Array.from(selected),
          recipientEmail: accountant.email,
          recipientName: accountant.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to send');
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to send');
    }
  }

  if (invoices.length === 0) {
    return (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <h3 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Email invoices to accountant</h3>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>No invoices in the last 12 months.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>Email invoices to accountant</h3>
        <select
          value={month}
          onChange={e => changeMonth(e.target.value)}
          style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 6px', color: '#fff', fontSize: 11, fontFamily: 'var(--mono)' }}
        >
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <button onClick={toggleAll} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--brass)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {selected.size === invoicesForMonth.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {invoicesForMonth.length === 0 ? (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>No invoices for {monthLabel(month)}.</p>
      ) : (
        <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 10 }}>
          {invoicesForMonth.map(inv => (
            <label key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggle(inv.id)} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inv.invoice_no} · {inv.client_name}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#fff' }}>₹{fmt(Number(inv.total))}</span>
            </label>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={accountantId}
          onChange={e => setAccountantId(e.target.value)}
          style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 8px', color: '#fff', fontSize: 12, flex: 1, minWidth: 120 }}
        >
          <option value="">Pick accountant...</option>
          {accountants.map(a => (
            <option key={a.id} value={a.id} disabled={!a.email}>{a.name}{a.email ? '' : ' (no email)'}</option>
          ))}
        </select>
        <button
          onClick={send}
          disabled={status === 'sending' || selected.size === 0}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', background: 'var(--brass)', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', opacity: status === 'sending' ? 0.6 : 1 }}
        >
          {status === 'sending' ? 'Sending...' : `Send (${selected.size})`}
        </button>
      </div>

      <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#666', marginTop: 6 }}>
        {selected.size} invoice{selected.size === 1 ? '' : 's'} selected · ₹{fmt(selectedTotal)}
      </p>

      {status === 'sent' && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#4caf50', marginTop: 6 }}>Sent to {accountant?.name}.</p>}
      {status === 'error' && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#e55', marginTop: 6 }}>{error}</p>}
    </div>
  );
}
