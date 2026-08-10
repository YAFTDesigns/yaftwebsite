'use client';

import { useState, useEffect } from 'react';
import styles from '../../../admin/testimonials/testimonials.module.css';
import { computeTaxFromMode, type InvoiceTaxMode } from '@/lib/invoiceMath';

type Client = { id: string; name: string; company_name: string | null };
type Job = {
  id: string; created_at: string; job_date: string;
  client_id: string | null; client_name: string; job_type: string;
  qty: number; rate: number; gst_type: string;
  cgst: number; sgst: number; igst: number; total: number;
  status: string; notes: string | null; invoice_id: string | null; deleted_at: string | null;
};

const JOB_TYPES = ['2D Drawing', '3D STL', 'Computational', 'Monthly Retainer'];
const GST_TYPES: { value: string; label: string }[] = [
  { value: 'intra', label: 'Intra-state (CGST 9% + SGST 9%)' },
  { value: 'inter', label: 'Inter-state (IGST 18%)' },
  { value: 'none', label: 'No GST (export/exempt)' },
];
const GST_TYPE_TO_TAX_MODE: Record<string, InvoiceTaxMode> = { intra: 'intra', inter: 'interstate', none: 'intl' };
const STATUSES = ['Pending', 'Invoiced', 'Paid'];

function fmt(n: number) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

const EMPTY_FORM = {
  client_id: '', client_name: '', job_type: JOB_TYPES[0],
  job_date: new Date().toISOString().slice(0, 10),
  qty: '1', rate: '0', gst_type: 'intra', notes: '',
};

export default function JobsClient() {
  const [tab, setTab] = useState<'log' | 'all' | 'trash'>('log');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trashedJobs, setTrashedJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

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

  useEffect(() => { loadJobs(); loadTrash(); loadClients(); }, []);

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const qtyNum = parseFloat(form.qty) || 0;
  const rateNum = parseFloat(form.rate) || 0;
  const preview = computeTaxFromMode(qtyNum * rateNum, GST_TYPE_TO_TAX_MODE[form.gst_type]);

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
      setForm({ ...EMPTY_FORM, job_date: new Date().toISOString().slice(0, 10) });
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      await loadJobs();
    } catch (err: any) {
      setFormError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(job: Job, status: string) {
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    await loadJobs();
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

  const statusColor = (s: string) => s === 'Paid' ? '#3fb950' : s === 'Invoiced' ? '#58a6ff' : '#d4a72c';

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
        <button className={`${styles.tab} ${tab === 'trash' ? styles.activeTab : ''}`} onClick={() => setTab('trash')}>Trash{trashedJobs.length > 0 ? ` (${trashedJobs.length})` : ''}</button>
      </div>

      {tab === 'log' && (
        <div style={{ maxWidth: 560 }}>
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
                      <p className={styles.cardName}>{j.client_name}</p>
                      <p className={styles.cardRole}>{j.job_type} · {j.qty} × INR {fmt(j.rate)}</p>
                      <p className={styles.cardCourse}>{j.job_date} · {j.gst_type === 'none' ? 'No GST' : j.gst_type === 'intra' ? 'Intra-state' : 'Inter-state'}</p>
                    </div>
                    <div className={styles.cardMeta} style={{ textAlign: 'right' }}>
                      <p className={styles.cardDate} style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>INR {fmt(j.total)}</p>
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontFamily: 'var(--mono)', color: statusColor(j.status), border: `1px solid ${statusColor(j.status)}`, borderRadius: 4, padding: '2px 8px' }}>{j.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {STATUSES.filter(s => s !== j.status).map(s => (
                      <button key={s} onClick={() => setStatus(j, s)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '5px 11px', fontSize: 11, cursor: 'pointer' }}>
                        Mark {s}
                      </button>
                    ))}
                    <button onClick={() => softDelete(j)} className={styles.deleteBtn} style={{ marginLeft: 'auto' }}>Delete</button>
                  </div>
                  {j.notes && <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>{j.notes}</p>}
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
    </div>
  );
}
