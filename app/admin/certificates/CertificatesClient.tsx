'use client';

import { useEffect, useState } from 'react';
import styles from '../testimonials/testimonials.module.css';

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
};

const COURSE_OPTIONS = [
  { key: 'rhino', label: 'Rhinoceros 3D (maroon)' },
  { key: 'grasshopper', label: 'Grasshopper (green)' },
];

const EMPTY_DRAFT = {
  student_name: '', student_email: '', course_key: 'rhino',
  course_suffix: 'FOR ARCHITECTURE', duration_hours: '30', issue_date: '',
};

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
    load();
  }, []);

  async function toggleRevoke(c: Certificate) {
    setBusyId(c.id);
    await fetch(API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, revoked: !c.revoked }),
    });
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
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, student_email: draft.student_email || undefined, issue_date: draft.issue_date || undefined }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { alert(json.error ?? 'Failed to create'); return; }
    setLastCreated(json.data.certificate_id);
    setDraft(EMPTY_DRAFT);
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Certificates</h1>
          <p className={styles.sub}>Issue and manage student certificates. Certificate IDs auto-generate as YAFT{'{'}YYYYMM{'}'}-{'{'}seq{'}'}. No PDF is stored, each one is generated fresh on download.</p>
        </div>
        <a href="/admin" className={styles.back}>← Back to admin</a>
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

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'var(--brass)' }}>{error}</p>}
      {!loading && items.length === 0 && <div className={styles.empty}>No certificates issued yet.</div>}

      <div className={styles.list}>
        {items.map(c => (
          <div key={c.id} className={styles.card} style={{ opacity: c.revoked ? 0.5 : 1 }}>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{c.student_name}</span>
              <span className={styles.cardMeta}>{c.certificate_id} · {c.course_key} {c.course_suffix} · {c.duration_hours}h · {c.issue_date}</span>
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
