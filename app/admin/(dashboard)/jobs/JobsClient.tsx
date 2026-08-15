'use client';

import { useState, useEffect } from 'react';
import styles from '@/components/admin/adminPage.module.css';
import { computeTaxFromMode, type InvoiceTaxMode } from '@/lib/invoiceMath';
import JobsSheetView from './JobsSheetView';
import { STATUS_COLORS_HEX } from '@/lib/jobsGrouping';
import { getErrorMessage } from '@/lib/errorMessage';

type Client = { id: string; name: string; company_name: string | null };
type Job = {
  id: string; created_at: string; job_date: string; job_no: string | null;
  client_id: string | null; client_name: string; job_type: string;
  qty: number; rate: number; gst_type: string;
  cgst: number; sgst: number; igst: number; total: number;
  status: string; notes: string | null; invoice_id: string | null; deleted_at: string | null;
  status_date?: string | null;
};
type StatusEvent = { id: string; status: string; note: string | null; created_at: string };

const JOB_TYPES = ['2D Drawing', '3D STL', 'Computational', 'Monthly Retainer'];
const GST_TYPES: { value: string; label: string }[] = [
  { value: 'intra', label: 'Intra-state (CGST 9% + SGST 9%)' },
  { value: 'inter', label: 'Inter-state (IGST 18%)' },
  { value: 'none', label: 'No GST (export/exempt)' },
];
const GST_TYPE_TO_TAX_MODE: Record<string, InvoiceTaxMode> = { intra: 'intra', inter: 'interstate', none: 'intl' };
const STATUSES = ['Pending', 'Submitted', 'In Review', 'Completed', 'Cancelled'];

function fmt(n: number) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

const EMPTY_FORM = {
  job_no: '', client_id: '', client_name: '', job_type: JOB_TYPES[0],
  job_date: new Date().toISOString().slice(0, 10),
  qty: '1', rate: '0', gst_type: 'intra', notes: '',
};

// Next sequential job order number, e.g. GY0001 -> GY0002. Looks at every
// job_no on file (not just the current filtered view) so numbering stays
// sequential regardless of status filters, matching how invoice numbers
// are suggested but editable.
function nextJobNo(jobs: Job[]): string {
  let max = 0;
  for (const j of jobs) {
    const match = /^GY(\d+)$/.exec(j.job_no ?? '');
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `GY${String(max + 1).padStart(4, '0')}`;
}

type InitialProps = {
  initialJobs?: Job[];
  initialTrash?: Job[];
  initialClients?: Client[];
};

export default function JobsClient({ initialJobs, initialTrash, initialClients }: InitialProps) {
  const hasInitialData = initialJobs !== undefined;
  const [tab, setTab] = useState<'log' | 'all' | 'sheet' | 'trash'>('log');
  const [jobs, setJobs] = useState<Job[]>(initialJobs ?? []);
  const [trashedJobs, setTrashedJobs] = useState<Job[]>(initialTrash ?? []);
  const [clients, setClients] = useState<Client[]>(initialClients ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [historyByJob, setHistoryByJob] = useState<Record<string, StatusEvent[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadJobs() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load');
      setJobs(json.jobs ?? []);
    } catch {
      setLoadError('Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }

  async function loadTrash() {
    try {
      const res = await fetch('/api/jobs?trash=1');
      const json = await res.json();
      setTrashedJobs(json.jobs ?? []);
    } catch { /* ignore */ }
  }

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const json = await res.json();
      setClients(json.clients ?? []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    // Server already fetched this on first render (see page.tsx) -- skip
    // the redundant client-side re-fetch so there's no double network
    // round trip on initial load. Subsequent refreshes after mutations
    // still go through loadJobs()/loadTrash()/loadClients() as normal.
    if (hasInitialData) return;
    loadJobs(); loadTrash(); loadClients();
  }, []);

  // Auto-suggest the next job number once jobs are loaded, but only when
  // the field is empty -- never clobbers something the user is mid-typing.
  useEffect(() => {
    setForm(f => f.job_no ? f : { ...f, job_no: nextJobNo(jobs) });
  }, [jobs]);

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const qtyNum = parseFloat(form.qty) || 0;
  const rateNum = parseFloat(form.rate) || 0;
  const preview = computeTaxFromMode(qtyNum * rateNum, GST_TYPE_TO_TAX_MODE[form.gst_type]);

  const editQtyNum = parseFloat(editForm.qty) || 0;
  const editRateNum = parseFloat(editForm.rate) || 0;
  const editPreview = computeTaxFromMode(editQtyNum * editRateNum, GST_TYPE_TO_TAX_MODE[editForm.gst_type]);

  function pickClient(id: string) {
    const c = clients.find(cl => cl.id === id);
    setForm(f => ({ ...f, client_id: id, client_name: c ? c.name : f.client_name }));
  }

  async function submitJob() {
    if (!form.client_name.trim()) { setFormError('Client name is required.'); return; }
    if (qtyNum <= 0) { setFormError('Quantity must be greater than 0.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qty: qtyNum, rate: rateNum }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setForm({ ...EMPTY_FORM, job_no: '', job_date: new Date().toISOString().slice(0, 10) });
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      await loadJobs();
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function openEditJob(job: Job) {
    setEditingJob(job);
    setEditForm({
      job_no: job.job_no ?? '',
      client_id: job.client_id ?? '',
      client_name: job.client_name,
      job_type: job.job_type,
      job_date: job.job_date,
      qty: String(job.qty),
      rate: String(job.rate),
      gst_type: job.gst_type,
      notes: job.notes ?? '',
    });
    setEditError('');
  }

  function setEF(k: keyof typeof EMPTY_FORM, v: string) { setEditForm(f => ({ ...f, [k]: v })); }

  async function saveEditJob() {
    if (!editingJob) return;
    if (!editForm.client_name.trim()) { setEditError('Client name is required.'); return; }
    const qty = parseFloat(editForm.qty) || 0;
    if (qty <= 0) { setEditError('Quantity must be greater than 0.'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, qty, rate: parseFloat(editForm.rate) || 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setEditingJob(null);
      await loadJobs();
    } catch (err) {
      setEditError(getErrorMessage(err) || 'Save failed');
    } finally {
      setEditSaving(false);
    }
  }

  async function loadHistory(jobId: string) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/events`);
      const json = await res.json();
      setHistoryByJob(h => ({ ...h, [jobId]: json.events ?? [] }));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function toggleHistory(jobId: string) {
    if (expandedHistoryId === jobId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(jobId);
    if (!historyByJob[jobId]) await loadHistory(jobId);
  }

  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async function setStatus(job: Job, status: string) {
    let status_note: string | undefined;
    if (status === 'In Review' || status === 'Cancelled') {
      const label = status === 'In Review' ? 'Reason sent back for review (optional):' : 'Reason for cancelling (optional):';
      const entered = window.prompt(label, '');
      if (entered === null) return; // cancelled the prompt itself
      status_note = entered.trim() || undefined;
    }
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, status_note }),
    });
    await loadJobs();
    if (expandedHistoryId === job.id) await loadHistory(job.id);
  }

  async function softDelete(job: Job) {
    if (!confirm(`Move this job (${job.client_name}, ${job.job_type}) to trash?`)) return;
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    await loadJobs();
    await loadTrash();
  }

  async function restore(job: Job) {
    await fetch(`/api/jobs/${job.id}`, { method: 'PUT' });
    await loadJobs();
    await loadTrash();
  }

  async function permanentDelete(job: Job) {
    if (!confirm('Permanently delete this job? This cannot be undone.')) return;
    await fetch(`/api/jobs/${job.id}?permanent=1`, { method: 'DELETE' });
    await loadTrash();
  }

  const visibleJobs = jobs.filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return j.client_name.toLowerCase().includes(q) || j.job_type.toLowerCase().includes(q);
  });

  const statusColor = (s: string) => STATUS_COLORS_HEX[s] ?? '#d4a72c';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Jobs</h1>
          <p className={styles.sub}>Log billable work, track status, and group into invoices later.</p>
        </div>
      </div>

      <div className={styles.tabs} style={{ marginBottom: 28 }}>
        <button className={`${styles.tab} ${tab === 'log' ? styles.activeTab : ''}`} onClick={() => setTab('log')}>Log Job</button>
        <button className={`${styles.tab} ${tab === 'all' ? styles.activeTab : ''}`} onClick={() => setTab('all')}>All Jobs{jobs.length > 0 ? ` (${jobs.length})` : ''}</button>
        <button className={`${styles.tab} ${tab === 'sheet' ? styles.activeTab : ''}`} onClick={() => setTab('sheet')}>Sheet View</button>
        <button className={`${styles.tab} ${tab === 'trash' ? styles.activeTab : ''}`} onClick={() => setTab('trash')}>Trash{trashedJobs.length > 0 ? ` (${trashedJobs.length})` : ''}</button>
      </div>

      {tab === 'sheet' && <JobsSheetView jobs={jobs} />}

      {tab === 'log' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job order no.</label>
            <input
              type="text"
              value={form.job_no}
              onChange={e => setF('job_no', e.target.value)}
              placeholder="GY0001"
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13, fontFamily: 'var(--mono)' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</label>
            <select
              value={form.client_id}
              onChange={e => pickClient(e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13, marginBottom: 8 }}
            >
              <option value="">— Pick existing client (optional) —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ''}</option>)}
            </select>
            <input
              type="text"
              placeholder="Or type a client name directly"
              value={form.client_name}
              onChange={e => setF('client_name', e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job type</label>
              <select value={form.job_type} onChange={e => setF('job_type', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }}>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
              <input type="date" value={form.job_date} onChange={e => setF('job_date', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantity</label>
              <input type="number" min="0" step="any" value={form.qty} onChange={e => setF('qty', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate (INR)</label>
              <input type="number" min="0" step="any" value={form.rate} onChange={e => setF('rate', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GST</label>
            <select value={form.gst_type} onChange={e => setF('gst_type', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }}>
              {GST_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13, resize: 'vertical' }} />
          </div>

          {/* Live GST breakdown, same computation the server will use */}
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '14px 16px', marginBottom: 18, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>Subtotal</span><span>INR {fmt(preview.subtotal)}</span></div>
            {preview.cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>CGST (9%)</span><span>INR {fmt(preview.cgst)}</span></div>}
            {preview.sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>SGST (9%)</span><span>INR {fmt(preview.sgst)}</span></div>}
            {preview.igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>IGST (18%)</span><span>INR {fmt(preview.igst)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a2a2a' }}><span>Total</span><span>INR {fmt(preview.total)}</span></div>
          </div>

          {formError && <p style={{ fontSize: 12, color: '#E63946', marginBottom: 12 }}>{formError}</p>}
          {done && <p style={{ fontSize: 12, color: '#3fb950', marginBottom: 12 }}>Job logged.</p>}

          <button onClick={submitJob} disabled={saving} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Log job'}
          </button>
        </div>
      )}

      {tab === 'all' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search client or job type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 260px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', color: '#ddd', fontSize: 13 }}
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', color: '#ddd', fontSize: 13 }}>
              <option value="all">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <a
              href={`/api/jobs/export?status=${statusFilter}`}
              style={{ background: 'transparent', border: '1px solid var(--brass)', color: 'var(--brass)', borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              ↓ Export to Excel
            </a>
          </div>

          {loading ? (
            <p className={styles.empty}>Loading...</p>
          ) : loadError ? (
            <p className={styles.empty}>{loadError}</p>
          ) : visibleJobs.length === 0 ? (
            <p className={styles.empty}>No jobs match.</p>
          ) : (
            <div className={styles.list}>
              {visibleJobs.map(j => (
                <div className={styles.card} key={j.id}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardName}>{j.job_no ? `${j.job_no} · ` : ''}{j.client_name}</p>
                      <p className={styles.cardRole}>{j.job_type} · {j.qty} × INR {fmt(j.rate)}</p>
                      <p className={styles.cardCourse}>{j.job_date} · {j.gst_type === 'none' ? 'No GST' : j.gst_type === 'intra' ? 'Intra-state' : 'Inter-state'}</p>
                    </div>
                    <div className={styles.cardMeta} style={{ textAlign: 'right' }}>
                      <p className={styles.cardDate} style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>INR {fmt(j.total)}</p>
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontFamily: 'var(--mono)', color: statusColor(j.status), border: `1px solid ${statusColor(j.status)}`, borderRadius: 4, padding: '2px 8px' }}>{j.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => openEditJob(j)} style={{ background: 'transparent', border: '1px solid var(--brass)', color: 'var(--brass)', borderRadius: 4, padding: '5px 11px', fontSize: 11, cursor: 'pointer' }}>
                      Edit
                    </button>
                    {STATUSES.filter(s => s !== j.status).map(s => (
                      <button key={s} onClick={() => setStatus(j, s)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '5px 11px', fontSize: 11, cursor: 'pointer' }}>
                        Mark {s}
                      </button>
                    ))}
                    <button onClick={() => toggleHistory(j.id)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '5px 11px', fontSize: 11, cursor: 'pointer' }}>
                      {expandedHistoryId === j.id ? 'Hide history' : 'History'}
                    </button>
                    <button onClick={() => softDelete(j)} className={styles.deleteBtn} style={{ marginLeft: 'auto' }}>Delete</button>
                  </div>
                  {j.notes && <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>{j.notes}</p>}

                  {expandedHistoryId === j.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
                      {historyLoading && !historyByJob[j.id] ? (
                        <p style={{ fontSize: 12, color: '#666' }}>Loading history...</p>
                      ) : (historyByJob[j.id] ?? []).length === 0 ? (
                        <p style={{ fontSize: 12, color: '#666' }}>No history yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(historyByJob[j.id] ?? []).map(ev => (
                            <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 12 }}>
                              <span style={{ fontFamily: 'var(--mono)', color: statusColor(ev.status), minWidth: 90 }}>{ev.status}</span>
                              <span style={{ color: '#666' }}>{fmtDateTime(ev.created_at)}</span>
                              {ev.note && <span style={{ color: '#999', fontStyle: 'italic' }}>— {ev.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'trash' && (
        trashedJobs.length === 0 ? (
          <p className={styles.empty}>Trash is empty.</p>
        ) : (
          <div className={styles.list}>
            {trashedJobs.map(j => (
              <div className={styles.card} key={j.id}>
                <div className={styles.cardTop}>
                  <div>
                    <p className={styles.cardName}>{j.client_name}</p>
                    <p className={styles.cardRole}>{j.job_type} · INR {fmt(j.total)}</p>
                    <p className={styles.cardCourse}>{j.job_date}</p>
                  </div>
                  <div className={styles.actions} style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => restore(j)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>Restore</button>
                    <button onClick={() => permanentDelete(j)} className={styles.deleteBtn}>Delete forever</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {editingJob && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 480, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>Edit job</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job order no.</label>
              <input type="text" value={editForm.job_no} onChange={e => setEF('job_no', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13, fontFamily: 'var(--mono)' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client name</label>
              <input type="text" value={editForm.client_name} onChange={e => setEF('client_name', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job type</label>
                <select value={editForm.job_type} onChange={e => setEF('job_type', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }}>
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                <input type="date" value={editForm.job_date} onChange={e => setEF('job_date', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantity</label>
                <input type="number" min="0" step="any" value={editForm.qty} onChange={e => setEF('qty', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate (INR)</label>
                <input type="number" min="0" step="any" value={editForm.rate} onChange={e => setEF('rate', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GST</label>
              <select value={editForm.gst_type} onChange={e => setEF('gst_type', e.target.value)} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13 }}>
                {GST_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
              <textarea value={editForm.notes} onChange={e => setEF('notes', e.target.value)} rows={2} style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#ddd', fontSize: 13, resize: 'vertical' }} />
            </div>

            <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>Subtotal</span><span>INR {fmt(editPreview.subtotal)}</span></div>
              {editPreview.cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>CGST (9%)</span><span>INR {fmt(editPreview.cgst)}</span></div>}
              {editPreview.sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>SGST (9%)</span><span>INR {fmt(editPreview.sgst)}</span></div>}
              {editPreview.igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', marginBottom: 4 }}><span>IGST (18%)</span><span>INR {fmt(editPreview.igst)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: '1px solid #2a2a2a' }}><span>Total</span><span>INR {fmt(editPreview.total)}</span></div>
            </div>

            {editError && <p style={{ fontSize: 12, color: '#E63946', marginBottom: 12 }}>{editError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setEditingJob(null)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEditJob} disabled={editSaving} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
