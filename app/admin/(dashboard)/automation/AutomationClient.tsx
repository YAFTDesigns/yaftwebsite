'use client';

import { useState } from 'react';

type Control = { job: string; enabled: boolean; max_total_sends: number | null; approved_emails: string[] | null; notes: string | null; updated_at: string | null; updated_by: string | null };
type Recipient = { email: string; name: string | null; source: string; last_activity: string; status: string; course_interest: string | null; selection_reason: string; subject: string };

const mono = { fontFamily: 'var(--mono)', fontSize: 13 } as const;
const box = { border: '1px solid var(--border, #333)', padding: 16, marginBottom: 12 } as const;
const btn = { ...mono, padding: '6px 12px', cursor: 'pointer' } as const;

export type AutomationData = { controls: Control[]; queues: unknown; due_scheduled_invoices: unknown[] };

export default function AutomationClient({ initial }: { initial: AutomationData }) {
  const [controls, setControls] = useState<Control[]>(initial.controls);
  const [extra, setExtra] = useState<{ queues?: unknown; due_scheduled_invoices?: unknown[] }>({ queues: initial.queues, due_scheduled_invoices: initial.due_scheduled_invoices });
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ recipients?: Recipient[]; excluded?: Record<string, number>; eligible_before_cap?: number; remaining_under_cap?: number | null; error?: string } | null>(null);
  const lf0 = initial.controls.find((c) => c.job === 'lead-follow-up');
  const [approvedText, setApprovedText] = useState((lf0?.approved_emails ?? []).join('\n'));
  const [cap, setCap] = useState(lf0?.max_total_sends?.toString() ?? '');

  async function load() {
    const res = await fetch('/api/admin/cron-controls', { cache: 'no-store' });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error ?? 'Failed to load'); return; }
    setControls(j.controls);
    setExtra({ queues: j.queues, due_scheduled_invoices: j.due_scheduled_invoices });
    const lf = (j.controls as Control[]).find((c) => c.job === 'lead-follow-up');
    setApprovedText((lf?.approved_emails ?? []).join('\n'));
    setCap(lf?.max_total_sends?.toString() ?? '');
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/cron-controls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    setMsg(res.ok ? 'Saved.' : (j.error ?? 'Failed'));
    await load();
  }

  async function runPreview() {
    setPreview(null);
    const res = await fetch('/api/cron/lead-follow-up?dry_run=1', { method: 'POST' });
    setPreview(await res.json());
  }

  async function sendTest() {
    if (!window.confirm('Send ONE [TEST] copy of the first proposed recipient\'s email to YOUR OWN admin address? No customer is emailed.')) return;
    setMsg('Sending test...');
    const res = await fetch('/api/cron/lead-follow-up?test=1', { method: 'POST' });
    const j = await res.json();
    setMsg(res.ok ? `Test ${j.status} to ${j.to} (rendered for ${j.rendered_for}). Subject: ${j.subject}${j.error ? ' | ' + j.error : ''}` : (j.error ?? 'Failed'));
  }

  return (
    <div style={mono}>
      {msg && <p>{msg}</p>}
      {controls.map((c) => (
        <div key={c.job} style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <strong>{c.job}</strong>
            <label>
              <input type="checkbox" checked={c.enabled} onChange={(e) => patch({ job: c.job, enabled: e.target.checked })} /> {c.enabled ? 'ON' : 'OFF'}
            </label>
          </div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>{c.notes}</div>
        </div>
      ))}

      <div style={box}>
        <strong>Lead follow-up pilot</strong>
        <p>Lifetime send cap (blank = none). The job switches itself off when the cap is reached.</p>
        <input value={cap} onChange={(e) => setCap(e.target.value)} style={{ ...mono, width: 80 }} />{' '}
        <button style={btn} onClick={() => patch({ job: 'lead-follow-up', max_total_sends: cap.trim() === '' ? null : Number(cap) })}>Save cap</button>
        <p>Approved recipients (one email per line). Only these can be emailed. Blank = no restriction.</p>
        <textarea value={approvedText} onChange={(e) => setApprovedText(e.target.value)} rows={6} style={{ ...mono, width: '100%' }} />
        <button style={btn} onClick={() => patch({ job: 'lead-follow-up', approved_emails: approvedText.split(/\s+/).filter(Boolean).length ? approvedText.split(/\s+/).filter(Boolean) : null })}>Save approved list</button>{' '}
        <button style={btn} onClick={runPreview}>Preview recipients (sends nothing)</button>{' '}
        <button style={btn} onClick={sendTest}>Send test to my own address</button>
        {preview && (
          <div style={{ marginTop: 12 }}>
            {preview.error && <p>{preview.error}</p>}
            <p>Eligible before cap: {preview.eligible_before_cap} | Remaining under cap: {preview.remaining_under_cap ?? 'no cap'}</p>
            <p>Excluded: {JSON.stringify(preview.excluded)}</p>
            {(preview.recipients ?? []).map((r) => (
              <div key={r.email} style={{ borderTop: '1px solid #333', padding: '8px 0' }}>
                <div>{r.email} ({r.name ?? 'no name'}) | {r.source} | last active {r.last_activity} | {r.status}</div>
                <div style={{ opacity: 0.7 }}>{r.selection_reason}</div>
                <div style={{ opacity: 0.7 }}>Subject: {r.subject}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={box}>
        <strong>Read-only: retry queue and due scheduled invoices</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ queues: extra.queues, due_scheduled_invoices: extra.due_scheduled_invoices }, null, 2)}</pre>
      </div>
    </div>
  );
}
