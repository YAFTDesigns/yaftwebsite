'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '@/components/admin/adminPage.module.css';
import JobsSheetView from '../../jobs/JobsSheetView';
import { getErrorMessage } from '@/lib/errorMessage';

type Client = {
  id: string; name: string; company_name: string | null; gstin: string | null;
  address: string | null; phone: string | null; email: string | null; active: boolean;
};
type Job = {
  id: string; job_no: string | null; job_date: string; job_type: string; client_name: string;
  qty: number; rate: number; gst_type: string; cgst: number; sgst: number; igst: number; total: number;
  status: string; notes: string | null; invoice_id: string | null; status_date?: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  Completed: '#3fb950', Cancelled: '#E63946', 'In Review': '#a371f7', Submitted: '#58a6ff', Pending: '#d4a72c',
};

function fmt(n: number) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function ClientJobsClient({
  clientId, initialClient, initialJobs,
}: { clientId: string; initialClient?: Client; initialJobs?: Job[] }) {
  const router = useRouter();
  const hasInitialData = initialClient !== undefined;
  const [client, setClient] = useState<Client | null>(initialClient ?? null);
  const [jobs, setJobs] = useState<Job[]>(initialJobs ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'bill' | 'sheet'>('bill');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [clientRes, jobsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/jobs?client_id=${clientId}`),
      ]);
      const clientJson = await clientRes.json();
      const jobsJson = await jobsRes.json();
      if (!clientRes.ok) throw new Error(clientJson?.error ?? 'Client not found');
      setClient(clientJson.client);
      setJobs(jobsJson.jobs ?? []);
    } catch (err) {
      setLoadError(getErrorMessage(err) || 'Could not load client.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Server already fetched this on first render (see page.tsx) -- skip
    // the redundant client-side re-fetch on initial mount.
    if (hasInitialData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount unless server already provided the data, not a cascading-render bug
    load();
  }, [clientId]);

  function toggle(jobId: string) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  }

  const billableJobs = jobs.filter(j => !j.invoice_id && j.status !== 'Cancelled');
  const selectedJobs = jobs.filter(j => selected.has(j.id));
  const selectedTotal = selectedJobs.reduce((s, j) => s + Number(j.total), 0);

  function selectAllBillable() {
    setSelected(new Set(billableJobs.map(j => j.id)));
  }

  function billSelected() {
    if (!client || selectedJobs.length === 0) return;

    const items = selectedJobs.map(j => ({
      desc: [j.job_no, j.job_type, new Date(j.job_date).toLocaleDateString('en-IN'), j.notes].filter(Boolean).join(' — '),
      hrs: 0,
      qty: Number(j.qty),
      rate: Number(j.rate),
    }));

    const payload = {
      client_name: client.name,
      client_email: client.email || '',
      client_company: client.company_name || '',
      client_gst: client.gstin || '',
      client_address: client.address || '',
      client_phone: client.phone || '',
      client_type: client.company_name ? 'company' : 'individual',
      client_id: client.id,
      items,
      jobIds: selectedJobs.map(j => j.id),
    };

    sessionStorage.setItem('yaftInvoicePrefill', JSON.stringify(payload));
    router.push('/admin/invoices?prefillFromJobs=1');
  }

  if (loading) return <div className={styles.page}><p className={styles.empty}>Loading...</p></div>;
  if (loadError || !client) return <div className={styles.page}><p className={styles.empty}>{loadError || 'Client not found.'}</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link href="/admin/clients" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#777', textDecoration: 'none' }}>← All clients</Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>{client.name}</h1>
          <p className={styles.sub}>
            {[client.company_name, client.gstin, client.email, client.phone].filter(Boolean).join(' · ') || 'No contact details on file'}
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <p className={styles.empty}>No jobs logged for this client yet.</p>
      ) : (
        <>
          <div className={styles.tabs} style={{ marginBottom: 20 }}>
            <button className={`${styles.tab} ${view === 'bill' ? styles.activeTab : ''}`} onClick={() => setView('bill')}>Billing</button>
            <button className={`${styles.tab} ${view === 'sheet' ? styles.activeTab : ''}`} onClick={() => setView('sheet')}>Sheet View</button>
          </div>

          {view === 'sheet' ? (
            <JobsSheetView jobs={jobs} hideClientColumn />
          ) : (
          <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <button onClick={selectAllBillable} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
              Select all billable ({billableJobs.length})
            </button>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#777', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                Clear selection
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #2a2a2a', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2a', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', width: 36 }}></th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>JOB NO</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>DATE</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>TYPE</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>QTY</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>RATE</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>TOTAL</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>STATUS</th>
                  <th style={{ padding: '10px 12px', color: '#888', fontFamily: 'var(--mono)', fontSize: 11 }}>BILLING</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => {
                  const billable = !j.invoice_id && j.status !== 'Cancelled';
                  return (
                    <tr key={j.id} style={{ borderBottom: '1px solid #1a1a1a', opacity: billable ? 1 : 0.5 }}>
                      <td style={{ padding: '10px 12px' }}>
                        {billable && <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggle(j.id)} />}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)' }}>{j.job_no || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa' }}>{j.job_date}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa' }}>{j.job_type}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa' }}>{j.qty}</td>
                      <td style={{ padding: '10px 12px', color: '#aaa' }}>{fmt(Number(j.rate))}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>{fmt(Number(j.total))}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: STATUS_COLOR[j.status] ?? '#888', border: `1px solid ${STATUS_COLOR[j.status] ?? '#888'}`, borderRadius: 4, padding: '2px 8px' }}>{j.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: '#666' }}>
                        {j.invoice_id ? 'Already invoiced' : j.status === 'Cancelled' ? 'Cancelled' : 'Not yet billed'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected.size > 0 && (
            <div style={{
              position: 'sticky', bottom: 20, marginTop: 20,
              background: '#111', border: '1px solid var(--brass)', borderRadius: 8,
              padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, color: '#ddd' }}>
                {selected.size} job{selected.size > 1 ? 's' : ''} selected — <strong>INR {fmt(selectedTotal)}</strong>
              </span>
              <button onClick={billSelected} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Bill Selected Jobs →
              </button>
            </div>
          )}
          </>
          )}
        </>
      )}
    </div>
  );
}
