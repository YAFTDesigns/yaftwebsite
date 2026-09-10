'use client';

import { useState } from 'react';

export default function DeclinedToggle({ leadId, initialDeclined }: { leadId: string; initialDeclined: boolean }) {
  const [declined, setDeclined] = useState(initialDeclined);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !declined;
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declined: next }),
      });
      if (res.ok) setDeclined(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={declined ? 'Marked declined -- excluded from the follow-up reminder. Click to unmark.' : 'Mark as declined -- excludes them from the follow-up reminder'}
      style={{
        fontFamily: 'var(--mono)', fontSize: 11,
        color: declined ? '#e55' : '#666',
        background: 'transparent',
        border: declined ? '1px solid #5a1a1a' : '1px solid #2a2a2a',
        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
        opacity: busy ? 0.5 : 1,
      }}
    >
      {declined ? '✕ Declined' : 'Mark declined'}
    </button>
  );
}
