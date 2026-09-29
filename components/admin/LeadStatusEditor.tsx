'use client';

import { useState } from 'react';

const STATUSES = [
  { value: 'new', label: 'New', color: '#888' },
  { value: 'contacted', label: 'Contacted', color: 'var(--blueprint, #40E0D0)' },
  { value: 'interested', label: 'Interested', color: '#e5a935' },
  { value: 'confirmed', label: 'Confirmed', color: '#4caf50' },
  { value: 'lost', label: 'Lost', color: '#666' },
] as const;

type Props = {
  leadId: string;
  initialStatus: string;
  initialNotes: string | null;
  initialFollowUp: string | null;
};

// Compact, click-to-expand editor -- same interaction shape as
// DeclinedToggle (a one-line control by default), but this one has
// three fields, so it expands into a small popover on click rather
// than trying to cram status+notes+date into the table row directly.
export default function LeadStatusEditor({ leadId, initialStatus, initialNotes, initialFollowUp }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [followUp, setFollowUp] = useState(initialFollowUp ?? '');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  async function save(patch: Record<string, unknown>) {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed');
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'relative', fontFamily: 'var(--mono)', fontSize: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: 'transparent', border: `1px solid ${current.color}`, color: current.color, borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--mono)' }}
      >
        {current.label} {followUp && '•'}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 6, padding: 12, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
          <select
            value={status}
            onChange={(e) => { const v = e.target.value; setStatus(v); save({ status: v }); }}
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 12, padding: '5px 6px', marginBottom: 8 }}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <label style={{ display: 'block', fontSize: 10, color: '#888', marginBottom: 3 }}>Follow-up date</label>
          <input
            type="date"
            value={followUp}
            onChange={(e) => { setFollowUp(e.target.value); save({ follow_up_date: e.target.value || null }); }}
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 12, padding: '5px 6px', marginBottom: 8 }}
          />

          <label style={{ display: 'block', fontSize: 10, color: '#888', marginBottom: 3 }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save({ notes })}
            rows={3}
            style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 4, color: '#fff', fontSize: 12, padding: '5px 6px', resize: 'vertical' }}
          />
          {saving && <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>Saving…</div>}
          {error && <div style={{ fontSize: 10, color: '#E63946', marginTop: 4 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
