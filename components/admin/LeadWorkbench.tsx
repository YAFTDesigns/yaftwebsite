'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LEAD_STATUSES, PROPOSAL_STATUSES, PAYMENT_STATUSES, PROPOSAL_LABELS, PAYMENT_LABELS } from '@/lib/admin/leadPipeline';

type Props = {
  leadId: string;
  status: string;
  followUp: string | null;
  proposal: string;
  payment: string;
  interest: string | null;
};

const field = { background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 13, padding: '6px 8px', width: '100%' } as const;
const label = { display: 'block', fontFamily: 'var(--mono)', fontSize: 10, color: '#888', margin: '10px 0 3px' } as const;

// One place to move a lead along: pipeline, next date, proposal, payment, plus a note.
// Every change saves immediately and refreshes the timeline.
export default function LeadWorkbench({ leadId, status, followUp, proposal, payment, interest }: Props) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [interestVal, setInterestVal] = useState(interest ?? '');

  async function call(url: string, method: string, payload: Record<string, unknown>) {
    setMsg('Saving…');
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { setMsg((await res.json().catch(() => null))?.error ?? 'Save failed'); return false; }
    setMsg('Saved');
    router.refresh();
    return true;
  }
  const patch = (p: Record<string, unknown>) => call(`/api/admin/leads/${leadId}`, 'PATCH', p);

  async function addNote() {
    if (!note.trim()) return;
    if (await call(`/api/admin/leads/${leadId}/notes`, 'POST', { body: note })) setNote('');
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <label style={label}>Pipeline status</label>
      <select style={field} defaultValue={status} onChange={(e) => patch({ status: e.target.value })}>
        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
      </select>

      <label style={label}>Next follow-up date</label>
      <input style={field} type="date" defaultValue={followUp ?? ''} onChange={(e) => patch({ follow_up_date: e.target.value || null })} />

      <label style={label}>Proposal</label>
      <select style={field} defaultValue={proposal} onChange={(e) => patch({ proposal_status: e.target.value })}>
        {PROPOSAL_STATUSES.map((s) => <option key={s} value={s}>{PROPOSAL_LABELS[s]}</option>)}
      </select>

      <label style={label}>Payment</label>
      <select style={field} defaultValue={payment} onChange={(e) => patch({ payment_status: e.target.value })}>
        {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>)}
      </select>

      <label style={label}>Course / service interest</label>
      <input style={field} value={interestVal} maxLength={120} onChange={(e) => setInterestVal(e.target.value)} onBlur={() => interestVal !== (interest ?? '') && patch({ service_interest: interestVal })} />

      <label style={label}>Add a note</label>
      <textarea style={{ ...field, resize: 'vertical' }} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Call summary, what was promised, what is next" />
      <button onClick={addNote} disabled={!note.trim()} style={{ marginTop: 8, background: 'transparent', border: '1px solid var(--blueprint, #40E0D0)', color: 'var(--blueprint, #40E0D0)', borderRadius: 4, padding: '5px 12px', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer' }}>
        Add note
      </button>
      {msg && <span style={{ marginLeft: 10, fontFamily: 'var(--mono)', fontSize: 11, color: msg === 'Saved' ? '#4caf50' : '#888' }}>{msg}</span>}
    </div>
  );
}
