'use client';

import { useEffect, useState } from 'react';
import styles from '@/components/admin/adminPage.module.css';
import { jsonInit } from '@/lib/jsonInit';

const API = '/api/admin/certificates';

type Certificate = {
  id: string;
  certificate_id: string;
  student_name: string;
  student_email: string | null;
  course_key: string;
  course_suffix: string;
  duration_hours: string;
  issue_date: string;
  revoked: boolean;
  notes: string | null;
  company?: string | null;
  batch_ref?: string | null;
};

const COURSE_OPTIONS = [
  { key: 'rhino', label: 'Rhinoceros 3D (maroon)' },
  { key: 'grasshopper', label: 'Grasshopper (green)' },
];

const EMPTY_DRAFT = {
  student_name: '', student_email: '', course_key: 'rhino',
  course_suffix: 'FOR ARCHITECTURE', duration_hours: '30', issue_date: '',
};

const EMPTY_BATCH = { company: '', batch_ref: '', course_key: 'rhino', course_suffix: 'FOR ARCHITECTURE', duration_hours: '30', issue_date: '', people: '' };

const inputStyle: React.CSSProperties = {
  background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 4,
  color: 'var(--ink)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 13, width: '100%',
};

export default function AdminCertificatesPage({ initialItems }: { initialItems?: Certificate[] }) {
  const hasInitialData = initialItems !== undefined;
  const [items, setItems] = useState<Certificate[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const [batch, setBatch] = useState(EMPTY_BATCH);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchDone, setBatchDone] = useState<{ count: number; ref: string | null } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(API);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed to load'); setItems([]); }
    else { setError(null); setItems(json.data ?? []); }
    setLoading(false);
  }

  useEffect(() => {
    if (hasInitialData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount unless server already provided the data, not a cascading-render bug
    load();
  }, [hasInitialData]);

  async function toggleRevoke(c: Certificate) {
    setBusyId(c.id);
    await fetch(API, jsonInit('PATCH', { id: c.id, revoked: !c.revoked }));
    await load();
    setBusyId(null);
  }

  async function createCertificate() {
    if (!draft.student_name || !draft.course_suffix || !draft.duration_hours) {
      alert('Student name, course suffix, and duration are required.');
      return;
    }
    setCreating(true);
    setLastCreated(null);
    const res = await fetch(API, jsonInit('POST', { ...draft, student_email: draft.student_email || undefined, issue_date: draft.issue_date || undefined }));
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { alert(json.error ?? 'Failed to create'); return; }
    setLastCreated(json.data.certificate_id);
    setDraft(EMPTY_DRAFT);
    await load();
  }

  async function issueBatch() {
    // one participant per line: "Name" or "Name, email"
    const participants = batch.people.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [name, ...rest] = l.split(','); return { name: name.trim(), email: rest.join(',').trim() }; });
    if (!batch.company.trim() || !participants.length) { alert('Company name and at least one participant are required.'); return; }
    if (!window.confirm(`Issue ${participants.length} certificate(s) for ${batch.company.trim()}?`)) return;
    setBatchBusy(true); setBatchDone(null);
    const res = await fetch(API, jsonInit('POST', { company: batch.company, batch_ref: batch.batch_ref, course_key: batch.course_key, course_suffix: batch.course_suffix, duration_hours: batch.duration_hours, issue_date: batch.issue_date || undefined, participants }));
    const json = await res.json();
    setBatchBusy(false);
    if (!res.ok) { alert(json.error ?? 'Failed to issue the batch'); await load(); return; }
    setBatchDone({ count: json.count, ref: json.batch_ref ?? null });
    setBatch(EMPTY_BATCH);
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Certificates</h1>
          <p className={styles.sub}>Issue and manage student certificates. Certificate IDs auto-generate as YAFT{'{'}YYYYMM{'}'}-{'{'}seq{'}'}. No PDF is stored, each one is generated fresh on download.</p>
        </div>

      </div>

      {/* Add new certificate */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 20, marginBottom: 32, display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', background: 'var(--paper-2)' }}>
        <input style={inputStyle} placeholder="Student full name" value={draft.student_name} onChange={e => setDraft(d => ({ ...d, student_name: e.target.value }))} />
        <input style={inputStyle} placeholder="Student email (optional)" value={draft.student_email} onChange={e => setDraft(d => ({ ...d, student_email: e.target.value }))} />
        <select style={inputStyle} value={draft.course_key} onChange={e => setDraft(d => ({ ...d, course_key: e.target.value }))}>
          {COURSE_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input style={inputStyle} placeholder="Course suffix, e.g. FOR ARCHITECTURE" value={draft.course_suffix} onChange={e => setDraft(d => ({ ...d, course_suffix: e.target.value.toUpperCase() }))} />
        <input style={inputStyle} placeholder="Duration hours, e.g. 30" value={draft.duration_hours} onChange={e => setDraft(d => ({ ...d, duration_hours: e.target.value }))} />
        <input style={inputStyle} type="date" value={draft.issue_date} onChange={e => setDraft(d => ({ ...d, issue_date: e.target.value }))} />
        <button className={styles.approveBtn} disabled={creating} onClick={createCertificate} style={{ justifySelf: 'start' }}>
          {creating ? 'Issuing…' : 'Issue certificate'}
        </button>
        {lastCreated && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#4caf50', gridColumn: '1 / -1' }}>
            ✓ Issued {lastCreated} — <a href={`/api/certificates/${lastCreated}/pdf`} style={{ color: '#4caf50' }} target="_blank" rel="noreferrer">download PDF</a>
          </p>
        )}
      </div>

      {/* Corporate batch: one bill, many certificates */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 20, marginBottom: 32, display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', background: 'var(--paper-2)' }}>
        <strong style={{ gridColumn: '1 / -1', fontFamily: 'var(--mono)', fontSize: 13 }}>Corporate batch: one bill, many certificates</strong>
        <input style={inputStyle} placeholder="Company name (printed as Employee of ...)" value={batch.company} onChange={e => setBatch(d => ({ ...d, company: e.target.value }))} />
        <input style={inputStyle} placeholder="Company bill number, e.g. YAFT-112026-23" value={batch.batch_ref} onChange={e => setBatch(d => ({ ...d, batch_ref: e.target.value }))} />
        <select style={inputStyle} value={batch.course_key} onChange={e => setBatch(d => ({ ...d, course_key: e.target.value }))}>
          {COURSE_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input style={inputStyle} placeholder="Course suffix, e.g. FOR ARCHITECTURE" value={batch.course_suffix} onChange={e => setBatch(d => ({ ...d, course_suffix: e.target.value.toUpperCase() }))} />
        <input style={inputStyle} placeholder="Duration hours, e.g. 30" value={batch.duration_hours} onChange={e => setBatch(d => ({ ...d, duration_hours: e.target.value }))} />
        <input style={inputStyle} type="date" value={batch.issue_date} onChange={e => setBatch(d => ({ ...d, issue_date: e.target.value }))} />
        <textarea style={{ ...inputStyle, gridColumn: '1 / -1', minHeight: 110 }} placeholder={'One participant per line (attendance confirmed):\nAsha Raman\nRavi Kumar, ravi@company.com'} value={batch.people} onChange={e => setBatch(d => ({ ...d, people: e.target.value }))} />
        <button className={styles.approveBtn} disabled={batchBusy} onClick={issueBatch} style={{ justifySelf: 'start' }}>{batchBusy ? 'Issuing…' : 'Issue batch'}</button>
        {batchDone && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#4caf50', gridColumn: '1 / -1' }}>
            ✓ Issued {batchDone.count} certificate(s).{' '}
            {batchDone.ref && <a href={`/api/admin/certificates/zip?batch=${encodeURIComponent(batchDone.ref)}`} style={{ color: '#4caf50' }}>Download all as zip</a>}
          </p>
        )}
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'var(--brass)' }}>{error}</p>}
      {!loading && items.length === 0 && <div className={styles.empty}>No certificates issued yet.</div>}

      <div className={styles.list}>
        {items.map(c => (
          <div key={c.id} className={styles.card} style={{ opacity: c.revoked ? 0.5 : 1 }}>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{c.student_name}</span>
              <span className={styles.cardMeta}>{c.certificate_id} · {c.course_key} {c.course_suffix} · {c.duration_hours}h · {c.issue_date}{c.company ? ` · ${c.company}` : ''}{c.batch_ref ? ` · bill ${c.batch_ref}` : ''}</span>
            </div>
            {c.student_email && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#888' }}>{c.student_email}</p>}
            <div className={styles.actions}>
              <a href={`/api/certificates/${c.certificate_id}/pdf`} target="_blank" rel="noreferrer" className={styles.approveBtn} style={{ textDecoration: 'none', display: 'inline-block' }}>
                Download PDF
              </a>
              <button className={styles.rejectBtn} disabled={busyId === c.id} onClick={() => toggleRevoke(c)}>
                {c.revoked ? 'Restore' : 'Revoke'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
