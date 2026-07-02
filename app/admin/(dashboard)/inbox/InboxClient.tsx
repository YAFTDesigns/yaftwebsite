'use client';

import { useEffect, useState, useCallback } from 'react';

type Log = {
  id: string;
  created_at: string;
  to_email: string;
  to_name: string;
  subject: string;
  status: string;
  error: string | null;
  template: string;
};

const TEMPLATE_LABELS: Record<string, string> = {
  enquiry_confirmation: 'Enquiry',
  invoice:              'Invoice',
  proforma_invoice:     'Proforma',
  syllabus_access:      'Syllabus',
};

const STATUS_COLOR: Record<string, string> = {
  sent:    '#4caf50',
  failed:  '#e53935',
  pending: '#ff9800',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function InboxClient() {
  const [logs, setLogs]       = useState<Log[]>([]);
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Log | null>(null);
  const [filter, setFilter]   = useState<string>('all');

  const fetchLogs = useCallback(async (q: string) => {
    setLoading(true);
    const url = `/api/admin/emails?type=logs${q ? `&search=${encodeURIComponent(q)}` : ''}`;
    const res = await fetch(url);
    const json = await res.json();
    setLogs(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(''); }, [fetchLogs]);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); fetchLogs(search); }, 350);
    return () => clearTimeout(t);
  }, [search, fetchLogs]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.template === filter);

  const templates = ['all', ...Array.from(new Set(logs.map(l => l.template)))];

  return (
    <div style={{ fontFamily: 'var(--sans)', maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--blueprint)', textTransform: 'uppercase', marginBottom: 6 }}>Email Inbox</p>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', marginBottom: 16 }}>All sent emails</h1>

        {/* Search + filter row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, email, subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 220,
              background: 'var(--surface-1)', border: '0.5px solid var(--border)',
              borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)',
              fontSize: 13, outline: 'none', fontFamily: 'var(--mono)',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {templates.map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{
                background: filter === t ? 'var(--blueprint)' : 'var(--surface-1)',
                border: '0.5px solid var(--border)',
                color: filter === t ? '#fff' : 'var(--text-secondary)',
                borderRadius: 4, padding: '6px 12px', fontSize: 11,
                fontFamily: 'var(--mono)', letterSpacing: '0.06em', cursor: 'pointer',
                textTransform: 'uppercase',
              }}>
                {t === 'all' ? 'All' : (TEMPLATE_LABELS[t] ?? t)}
              </button>
            ))}
          </div>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {filtered.length} emails
          </span>
        </div>
      </div>

      {/* File manager list */}
      <div style={{ border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '24px 140px 1fr 120px 80px 72px',
          gap: 0, padding: '8px 14px',
          background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border)',
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.08em',
          color: 'var(--text-muted)', textTransform: 'uppercase',
        }}>
          <span></span>
          <span>Type</span>
          <span>To / Subject</span>
          <span>Email</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Date</span>
        </div>

        {loading && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
            Loading...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 12 }}>
            No emails found
          </div>
        )}

        {!loading && filtered.map((log, i) => (
          <div
            key={log.id}
            onClick={() => setSelected(selected?.id === log.id ? null : log)}
            style={{
              display: 'grid', gridTemplateColumns: '24px 140px 1fr 120px 80px 72px',
              gap: 0, padding: '9px 14px',
              borderBottom: i < filtered.length - 1 ? '0.5px solid var(--border)' : 'none',
              background: selected?.id === log.id ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer', alignItems: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (selected?.id !== log.id) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-1)'; }}
            onMouseLeave={e => { if (selected?.id !== log.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            {/* Icon */}
            <span style={{ fontSize: 12 }}>✉</span>

            {/* Type badge */}
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
              color: 'var(--blueprint)', textTransform: 'uppercase',
            }}>
              {TEMPLATE_LABELS[log.template] ?? log.template}
            </span>

            {/* Name + subject */}
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{log.to_name || '—'}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{log.subject}</span>
            </div>

            {/* Email */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {log.to_email}
            </span>

            {/* Status */}
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: STATUS_COLOR[log.status] ?? 'var(--text-muted)' }}>
              {log.status}
            </span>

            {/* Date */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
              {formatDate(log.created_at)}
            </span>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          marginTop: 12, background: 'var(--surface-1)', border: '0.5px solid var(--border)',
          borderRadius: 8, padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--blueprint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {TEMPLATE_LABELS[selected.template] ?? selected.template}
              </p>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{selected.subject}</p>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background: 'transparent', border: '0.5px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 4, padding: '4px 10px',
              fontSize: 11, cursor: 'pointer',
            }}>✕ Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {[
              ['To', selected.to_name],
              ['Email', selected.to_email],
              ['Status', selected.status],
              ['Sent at', new Date(selected.created_at).toLocaleString('en-IN')],
              ...(selected.error ? [['Error', selected.error]] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
