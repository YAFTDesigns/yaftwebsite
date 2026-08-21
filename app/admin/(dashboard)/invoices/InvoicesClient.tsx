'use client';

import { useState, useEffect } from 'react';
import styles from '@/components/admin/adminPage.module.css';
import PieChart from '@/components/admin/PieChart';
import { computeInvoiceTotals } from '@/lib/invoiceMath';
import { monthKey, monthLabel, ddmmyyyyToIso } from '@/lib/jobsGrouping';
import { getErrorMessage } from '@/lib/errorMessage';

type Item = { desc: string; hrs: number; qty: number; rate: number; };
type ClientOption = {
  id: string; name: string; company_name: string | null; gstin: string | null;
  email: string | null; phone: string | null; address: string | null;
};
type TeamOption = { id: string; name: string; role: string | null; email: string | null };
type Invoice = {
  id: string; created_at: string; invoice_no: string; date: string;
  client_name: string; client_email: string; client_state: string;
  client_type: string; client_company: string | null;
  client_pan: string | null; client_gst: string | null;
  client_address: string | null; client_phone: string | null;
  items: Item[]; invoice_type: string;
  total: number; advance: number; balance: number; status: string;
  deleted_at: string | null;
};

const COURSES = [
  'Rhino3D for Architecture','Rhino3D for AEC & Climate Design',
  'Grasshopper for Computational Design','Rhino.Inside.Revit',
  'Wearables & Product Design','Custom Training',
];
const STATES = [
  'Tamil Nadu','Andhra Pradesh','Karnataka','Kerala','Maharashtra','Delhi',
  'Gujarat','Rajasthan','Telangana','West Bengal','Other',
  'Australia','Singapore','UAE','Oman','International',
];

function fmt(n: number) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function InvoicesClient({
  initialClientOptions, initialTrashedInvoices, initialTeamOptions,
}: { initialClientOptions?: ClientOption[]; initialTrashedInvoices?: Invoice[]; initialTeamOptions?: TeamOption[] } = {}) {
  const [tab, setTab] = useState<'create'|'sent'|'trash'|'log'>('create');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [trashedInvoices, setTrashedInvoices] = useState<Invoice[]>(initialTrashedInvoices ?? []);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const now = new Date();
  const mmyyyy = String(now.getMonth()+1).padStart(2,'0') + String(now.getFullYear());
  const [invoiceSeq, setInvoiceSeq] = useState('01');
  const [invoiceType, setInvoiceType] = useState<'training'|'consultancy'|'proforma'|'test'>('training');
  const autoInvNo = `YAFT-${mmyyyy}-${invoiceSeq.padStart(2,'0')}`;
  const today = new Date().toLocaleDateString('en-GB');

  const [form, setForm] = useState({
    invoice_no: autoInvNo, date: today, client_name:'', client_email:'',
    client_type:'individual', client_pan:'', client_gst:'',
    client_company:'', client_state:'Tamil Nadu',
    client_address:'', client_phone:'', schedule_note:'',
  });
  const [items, setItems] = useState<Item[]>([{ desc:'', hrs:0, qty:1, rate:0 }]);
  const [advance, setAdvance] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [formError, setFormError] = useState('');
  const [pdfUrl, setPdfUrl]   = useState('');

  // Handoff from a client's "Bill Selected Jobs" action on
  // /admin/clients/[id]. Consumed once on mount, not re-applied on
  // refresh -- sessionStorage key is cleared right after reading it.
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [jobsLinked, setJobsLinked] = useState(false);

  // Client picker for the create form: pick an existing client from the
  // register and auto-fill name/email/company/GST/address/phone instead
  // of retyping them, without having to go through the jobs->bill flow.
  const [clientOptions, setClientOptions] = useState<ClientOption[]>(initialClientOptions ?? []);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    if (initialClientOptions !== undefined) return;
    fetch('/api/clients?all=1')
      .then(res => res.json())
      .then(json => setClientOptions(json.clients ?? []))
      .catch(() => {});
  }, [initialClientOptions]);

  // "Email invoices to..." on the Sent tab: pick a month + a saved team
  // contact (accountant, etc.), sends that month's invoices as an .xlsx
  // attachment via /api/admin/invoices/email-monthly.
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>(initialTeamOptions ?? []);
  useEffect(() => {
    if (initialTeamOptions !== undefined) return;
    fetch('/api/team')
      .then(res => res.json())
      .then(json => setTeamOptions(json.team ?? []))
      .catch(() => {});
  }, [initialTeamOptions]);
  const [emailMonth, setEmailMonth] = useState('');
  const [emailRecipientId, setEmailRecipientId] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function sendMonthlyInvoiceEmail() {
    const recipient = teamOptions.find(t => t.id === emailRecipientId);
    if (!emailMonth) { setEmailResult({ ok: false, text: 'Pick a month first.' }); return; }
    if (!recipient?.email) { setEmailResult({ ok: false, text: 'Pick someone with an email on file.' }); return; }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch('/api/admin/invoices/email-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: emailMonth, recipientEmail: recipient.email, recipientName: recipient.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to send');
      setEmailResult({ ok: true, text: `Sent ${json.count} invoice${json.count > 1 ? 's' : ''} to ${recipient.name}.` });
    } catch (err) {
      setEmailResult({ ok: false, text: getErrorMessage(err) || 'Failed to send' });
    } finally {
      setEmailSending(false);
    }
  }

  function pickExistingClient(id: string) {
    setSelectedClientId(id);
    if (!id) return;
    const c = clientOptions.find(opt => opt.id === id);
    if (!c) return;
    setForm(f => ({
      ...f,
      client_name: c.name,
      client_email: c.email || f.client_email,
      client_company: c.company_name || '',
      client_gst: c.gstin || '',
      client_address: c.address || f.client_address,
      client_phone: c.phone || f.client_phone,
      client_type: c.company_name ? 'company' : 'individual',
    }));
  }

  useEffect(() => {
    const raw = sessionStorage.getItem('yaftInvoicePrefill');
    if (!raw) return;
    sessionStorage.removeItem('yaftInvoicePrefill');
    try {
      const payload = JSON.parse(raw);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes React state with sessionStorage (external system) on mount, not a cascading-render bug
      setForm(f => ({
        ...f,
        client_name: payload.client_name ?? f.client_name,
        client_email: payload.client_email ?? f.client_email,
        client_company: payload.client_company ?? f.client_company,
        client_gst: payload.client_gst ?? f.client_gst,
        client_address: payload.client_address ?? f.client_address,
        client_phone: payload.client_phone ?? f.client_phone,
        client_type: payload.client_type ?? f.client_type,
      }));
      if (Array.isArray(payload.items) && payload.items.length > 0) setItems(payload.items);
      if (Array.isArray(payload.jobIds)) setPendingJobIds(payload.jobIds);
      if (payload.client_id) setSelectedClientId(payload.client_id);
      setTab('create');
    } catch {
      // malformed payload, ignore and let the form start empty as usual
    }
  }, []);

  const { subtotal, cgst, sgst, igst, total: grandTotal, taxMode } = computeInvoiceTotals(items, form.client_state);
  const intra = taxMode === 'intra';
  const balance    = grandTotal - advance;

  function setF(k: string, v: string) { setForm(f => ({...f, [k]: v})); }
  function setItem(i: number, k: keyof Item, v: string) {
    setItems(prev => prev.map((it, idx) => idx===i ? {...it, [k]: k==='desc'?v:parseFloat(v)||0} : it));
  }

  const [editInv, setEditInv]   = useState<Invoice | null>(null);
  const [saving,  setSaving]    = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function patchInvoice(body: object) {
    const res = await fetch('/api/admin/invoices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({}));
  }

  const [resending, setResending] = useState(false);

  async function saveEdit() {
    if (!editInv) return false;
    setSaving(true); setSaveMsg('');
    const json = await patchInvoice({
      action: 'update_details',
      id: editInv.id,
      client_name: editInv.client_name,
      client_email: editInv.client_email,
      client_type: editInv.client_type,
      client_company: editInv.client_company,
      client_pan: editInv.client_pan,
      client_gst: editInv.client_gst,
      client_state: editInv.client_state,
      client_address: editInv.client_address,
      client_phone: editInv.client_phone,
      items: editInv.items,
      advance: editInv.advance,
    });
    setSaving(false);
    if (json.ok) {
      setEditInv(json.invoice);
      await loadInvoices();
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 3000);
      return true;
    }
    setSaveMsg('');
    alert(`Could not save: ${json.error ?? 'Unknown error'}`);
    return false;
  }

  async function saveAndResend() {
    const ok = await saveEdit();
    if (!ok || !editInv) return;
    setResending(true);
    try {
      const res = await fetch('/api/admin/invoices/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editInv.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Resend failed');
      setSaveMsg('Saved & resent to client');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (e) {
      alert(`Saved, but resend failed: ${getErrorMessage(e)}`);
    }
    setResending(false);
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Move this invoice to trash? You can restore it later from the Trash tab.')) return;
    setDeletingId(id);
    const json = await patchInvoice({ action: 'soft_delete', id });
    if (json.error) alert(`Could not delete invoice: ${json.error}`);
    if (editInv?.id === id) setEditInv(null);
    await loadInvoices();
    setDeletingId(null);
  }

  async function deleteAllMatching(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Move all ${ids.length} matching invoice${ids.length > 1 ? 's' : ''} to trash? You can restore them later from the Trash tab.`)) return;
    setDeletingId('bulk');
    const json = await patchInvoice({ action: 'bulk_soft_delete', ids });
    if (json.error) alert(`Could not delete invoices: ${json.error}`);
    setEditInv(null);
    await loadInvoices();
    setDeletingId(null);
  }

  async function restoreInvoice(id: string) {
    setDeletingId(id);
    const json = await patchInvoice({ action: 'restore', id });
    if (json.error) alert(`Could not restore invoice: ${json.error}`);
    await loadTrash();
    setDeletingId(null);
  }

  async function permanentlyDeleteInvoice(id: string) {
    if (!confirm('Permanently delete this invoice? This CANNOT be undone — it will be gone forever, not recoverable from trash.')) return;
    setDeletingId(id);
    const res = await fetch('/api/invoices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Failed to permanently delete invoice:', json.error);
      alert(`Could not permanently delete: ${json.error ?? 'Unknown error'}`);
    }
    await loadTrash();
    setDeletingId(null);
  }

  async function loadInvoices() {
    const res = await fetch('/api/admin/invoices');
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(json.error ?? 'Failed to load invoices');
    } else {
      setLoadError('');
      setInvoices(json.data ?? []);
    }
  }

  async function loadTrash() {
    const res = await fetch('/api/admin/invoices?trash=true');
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(json.error ?? 'Failed to load trash');
    } else {
      setLoadError('');
      setTrashedInvoices(json.data ?? []);
    }
  }

  type InvoiceLog = { id: string; created_at: string; invoice_no: string; event: string; message: string; };
  const [logs, setLogs] = useState<InvoiceLog[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  async function loadLogs() {
    setLogLoading(true);
    const res = await fetch('/api/admin/invoices?log=true');
    const json = await res.json().catch(() => ({}));
    if (res.ok) setLogs(json.data ?? []);
    setLogLoading(false);
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- fetch on tab change, not a cascading-render bug */
    if (tab === 'sent') loadInvoices();
    if (tab === 'trash') loadTrash();
    if (tab === 'log') loadLogs();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [tab]);

  // Load trash count on mount too, so the tab badge is accurate
  // before the user ever visits the Trash tab themselves.
  useEffect(() => {
    if (initialTrashedInvoices !== undefined) return;
    loadTrash();
  }, [initialTrashedInvoices]);

  async function generate() {
    setFormError(''); setSending(true); setDone(false); setPdfUrl('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items, grand_total: grandTotal, advance, balance, invoice_type: invoiceType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const blob = new Blob([Buffer.from(json.pdf, 'base64')], { type: 'application/pdf' });
      setPdfUrl(URL.createObjectURL(blob));
      setDone(true);

      // Link the source jobs back to this invoice, so /admin/clients/[id]
      // knows they're already billed and won't offer them for selection
      // again. Best-effort: if this fails, the invoice itself still went
      // out fine, it just means the jobs need linking by hand.
      if (pendingJobIds.length > 0 && json.invoiceId) {
        await Promise.all(
          pendingJobIds.map(id =>
            fetch(`/api/jobs/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoice_id: json.invoiceId }),
            }).catch(() => {})
          )
        );
        setJobsLinked(true);
        setPendingJobIds([]);
      }
    } catch (e) { setFormError(getErrorMessage(e) || 'Something went wrong'); }
    setSending(false);
  }


  function applyTestData() {
    setForm({
      invoice_no: autoInvNo, date: today,
      client_name: 'Test Client', client_email: 'test@example.com',
      client_type: 'individual', client_pan: 'TESTPAN001',
      client_gst: '', client_company: '', client_state: 'Tamil Nadu',
      client_address: '123 Test Street, Coimbatore, Tamil Nadu - 641001', client_phone: '+91 90000 00000',
      schedule_note: '',
    });
    setItems([{ desc: invoiceType === 'consultancy' ? 'Computational Design Consulting' : 'Rhino3D for Architecture', hrs: 10, qty: 1, rate: 5000 }]);
    setAdvance(0);
  }

  const inp: React.CSSProperties = {
    background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:6,
    padding:'8px 12px', fontFamily:'var(--mono)', fontSize:13, color:'#fff', width:'100%',
  };
  const lbl: React.CSSProperties = {
    fontFamily:'var(--mono)', fontSize:11, color:'#888', marginBottom:5, display:'block',
  };
  const sectionTitle: React.CSSProperties = {
    fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)',
    letterSpacing:'.06em', textTransform:'uppercase' as const, marginBottom:14,
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoices</h1>
          <p className={styles.sub}>Generate, send and track invoices and proforma quotes.</p>
        </div>
      </div>

      <div className={styles.tabs} style={{ marginBottom: 28 }}>
        <button className={`${styles.tab} ${tab==='create'?styles.activeTab:''}`} onClick={() => setTab('create')}>Create Invoice</button>
        <button className={`${styles.tab} ${tab==='sent'?styles.activeTab:''}`} onClick={() => setTab('sent')}>Sent Invoices</button>
        <button className={`${styles.tab} ${tab==='trash'?styles.activeTab:''}`} onClick={() => setTab('trash')}>Trash{trashedInvoices.length > 0 ? ` (${trashedInvoices.length})` : ''}</button>
        <button className={`${styles.tab} ${tab==='log'?styles.activeTab:''}`} onClick={() => setTab('log')}>Log</button>
      </div>

      {/* ── SENT INVOICES ── */}
      {tab === 'sent' && (
        invoices.length === 0
          ? <div>
              <p className={styles.empty}>{loadError ? 'Could not load invoices.' : 'No invoices sent yet.'}</p>
              {loadError && (
                <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55', marginTop:8 }}>
                  Error: {loadError}
                </p>
              )}
            </div>
          : <>
              <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:20, marginBottom:24 }}>
                <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>Payment status</p>
                <PieChart
                  size={120}
                  slices={[
                    { label: 'Fully paid', value: invoices.filter(i => i.balance === 0 && i.advance > 0).length, color: '#4caf50' },
                    { label: 'Outstanding', value: invoices.filter(i => i.balance > 0).length, color: '#E63946' },
                    { label: 'No payment yet', value: invoices.filter(i => i.advance === 0).length, color: '#555' },
                  ]}
                />
              </div>

              {/* search */}
              <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by client name, email, or invoice number..."
                  style={{
                    background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:8,
                    padding:'10px 14px', fontFamily:'var(--mono)', fontSize:13, color:'#fff', flex: 1,
                  }}
                />
                <a
                  href="/api/admin/invoices/export"
                  style={{ background: 'transparent', border: '1px solid var(--brass)', color: 'var(--brass)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  ↓ Export to Excel
                </a>
              </div>

              {/* Email a month's invoices to a saved contact (accountant, etc.) */}
              <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:16, marginBottom:24, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>Email invoices for</span>
                <select
                  value={emailMonth}
                  onChange={e => setEmailMonth(e.target.value)}
                  style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13 }}
                >
                  <option value="">Pick a month...</option>
                  {[...new Set(invoices.map(inv => monthKey(ddmmyyyyToIso(inv.date))))]
                    .sort()
                    .reverse()
                    .map(key => <option key={key} value={key}>{monthLabel(key)}</option>)}
                </select>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em' }}>to</span>
                <select
                  value={emailRecipientId}
                  onChange={e => setEmailRecipientId(e.target.value)}
                  style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13 }}
                >
                  <option value="">Pick someone...</option>
                  {teamOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.role ? ` — ${t.role}` : ''}{!t.email ? ' (no email on file)' : ''}</option>
                  ))}
                </select>
                <button
                  onClick={sendMonthlyInvoiceEmail}
                  disabled={emailSending}
                  style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: emailSending ? 0.6 : 1 }}
                >
                  {emailSending ? 'Sending...' : 'Send →'}
                </button>
                {emailResult && (
                  <span style={{ fontSize: 12, color: emailResult.ok ? '#3fb950' : '#E63946', width: '100%' }}>{emailResult.text}</span>
                )}
                {teamOptions.length === 0 && (
                  <span style={{ fontSize: 12, color: '#666', width: '100%' }}>No one in your team directory yet — add someone at /admin/team.</span>
                )}
              </div>

              {(() => {
                const q = searchQuery.trim().toLowerCase();
                const filtered = q
                  ? invoices.filter(inv =>
                      inv.client_name.toLowerCase().includes(q) ||
                      inv.client_email.toLowerCase().includes(q) ||
                      inv.invoice_no.toLowerCase().includes(q)
                    )
                  : invoices;

                return q ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 20 }}>
                    <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#888' }}>
                      {filtered.length} invoice{filtered.length === 1 ? '' : 's'} match &quot;{searchQuery}&quot;
                    </p>
                    {filtered.length > 0 && (
                      <button
                        className={styles.deleteBtn}
                        disabled={deletingId === 'bulk'}
                        onClick={() => deleteAllMatching(filtered.map(i => i.id))}
                      >
                        {deletingId === 'bulk' ? 'Deleting...' : `Delete all ${filtered.length} matching →`}
                      </button>
                    )}
                  </div>
                ) : null;
              })()}

              {(() => {
                const q = searchQuery.trim().toLowerCase();
                const filtered = q
                  ? invoices.filter(inv =>
                      inv.client_name.toLowerCase().includes(q) ||
                      inv.client_email.toLowerCase().includes(q) ||
                      inv.invoice_no.toLowerCase().includes(q)
                    )
                  : invoices;

                if (filtered.length === 0) {
                  return <p className={styles.empty}>No invoices match &quot;{searchQuery}&quot;.</p>;
                }

                // group by month/year based on created_at
                const groups = new Map<string, Invoice[]>();
                filtered.forEach(inv => {
                  const d = new Date(inv.created_at);
                  const key = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key)!.push(inv);
                });

                return Array.from(groups.entries()).map(([monthLabel, monthInvoices]) => {
                  const monthTotal = monthInvoices.reduce((s, i) => s + i.total, 0);
                  return (
                    <div key={monthLabel} style={{ marginBottom: 28 }}>
                      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 12 }}>
                        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--brass)', letterSpacing:'.06em', textTransform:'uppercase' }}>
                          {monthLabel} <span style={{ color:'#555', textTransform:'none', letterSpacing:'normal' }}>({monthInvoices.length})</span>
                        </p>
                        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#888' }}>INR {fmt(monthTotal)}</p>
                      </div>
                      <div className={styles.list}>
                        {monthInvoices.map(inv => (
                <div key={inv.id}>
                  <div className={styles.card}>
                    <div className={styles.cardTop}>
                      <div>
                        <p className={styles.cardName}>{inv.client_name}</p>
                        <p className={styles.cardRole}>{inv.client_email}</p>
                        <p className={styles.cardCourse}>{inv.invoice_no.includes('PF') ? 'Proforma' : 'Invoice'} #{inv.invoice_no} · {inv.date} · {inv.client_state}</p>
                      </div>
                      <div className={styles.cardMeta} style={{ textAlign:'right' }}>
                        <p className={styles.cardDate} style={{ fontWeight:700, fontSize:14, color:'#fff' }}>INR {fmt(inv.total)}</p>
                        {inv.advance > 0 && <p style={{ fontSize:11, fontFamily:'var(--mono)', color:'#555', marginTop:3 }}>Advance: INR {fmt(inv.advance)}</p>}
                        {inv.balance > 0 && <p style={{ fontSize:11, fontFamily:'var(--mono)', color:'#E63946', marginTop:2 }}>Balance: INR {fmt(inv.balance)}</p>}
                        {inv.balance === 0 && inv.advance > 0 && <p style={{ fontSize:11, fontFamily:'var(--mono)', color:'#4caf50', marginTop:2 }}>Fully paid</p>}
                        <p style={{ fontSize:10, fontFamily:'var(--mono)', color:'#4caf50', marginTop:4 }}>✓ Sent</p>
                      </div>
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.approveBtn}
                        onClick={() => setEditInv(editInv?.id === inv.id ? null : { ...inv })}
                      >
                        {editInv?.id === inv.id ? 'Cancel' : 'Edit invoice →'}
                      </button>
                      <button
                        className={styles.deleteBtn}
                        disabled={deletingId === inv.id}
                        onClick={() => deleteInvoice(inv.id)}
                      >
                        {deletingId === inv.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  {/* Inline edit panel */}
                  {editInv?.id === inv.id && (() => {
                    const { total: eTotal } = computeInvoiceTotals(editInv.items, editInv.client_state);
                    const eBalance = eTotal - (editInv.advance || 0);

                    function setEditField<K extends keyof Invoice>(k: K, v: Invoice[K]) {
                      setEditInv(prev => prev ? { ...prev, [k]: v } : prev);
                    }
                    function setEditItem(i: number, k: keyof Item, v: string) {
                      setEditInv(prev => {
                        if (!prev) return prev;
                        const items = prev.items.map((it, idx) => idx === i ? { ...it, [k]: k === 'desc' ? v : (parseFloat(v) || 0) } : it);
                        return { ...prev, items };
                      });
                    }

                    return (
                    <div style={{ background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:10, padding:20, marginTop:-1, marginBottom:8 }}>
                      <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>Edit invoice</p>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                        <div><span style={lbl}>Client Name</span><input style={inp} value={editInv.client_name} onChange={e=>setEditField('client_name', e.target.value)} /></div>
                        <div><span style={lbl}>Email</span><input style={inp} value={editInv.client_email} onChange={e=>setEditField('client_email', e.target.value)} /></div>
                        {editInv.client_type === 'company' && (
                          <>
                            <div><span style={lbl}>Company Name</span><input style={inp} value={editInv.client_company ?? ''} onChange={e=>setEditField('client_company', e.target.value)} /></div>
                            <div><span style={lbl}>GST Number</span><input style={inp} value={editInv.client_gst ?? ''} onChange={e=>setEditField('client_gst', e.target.value)} /></div>
                          </>
                        )}
                        {editInv.client_type !== 'company' && (
                          <div><span style={lbl}>PAN ID</span><input style={inp} value={editInv.client_pan ?? ''} onChange={e=>setEditField('client_pan', e.target.value)} /></div>
                        )}
                        <div>
                          <span style={lbl}>State / Country (for GST)</span>
                          <select style={inp} value={editInv.client_state} onChange={e=>setEditField('client_state', e.target.value)}>
                            {STATES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div><span style={lbl}>Address</span><textarea style={{ ...inp, minHeight:48 }} value={editInv.client_address ?? ''} onChange={e=>setEditField('client_address', e.target.value)} /></div>
                        <div><span style={lbl}>Phone</span><input style={inp} value={editInv.client_phone ?? ''} onChange={e=>setEditField('client_phone', e.target.value)} /></div>
                      </div>

                      <p style={{ ...sectionTitle, marginBottom:10 }}>Line items</p>
                      {editInv.items.map((item, i) => (
                        <div key={i} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:8, padding:12, marginBottom:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#555' }}>Item {i+1}</span>
                            {editInv.items.length > 1 && (
                              <button onClick={() => setEditInv(prev => prev ? { ...prev, items: prev.items.filter((_, idx) => idx !== i) } : prev)} style={{ fontFamily:'var(--mono)', fontSize:11, color:'#e55', background:'none', border:'none', cursor:'pointer' }}>Remove</button>
                            )}
                          </div>
                          <input style={{ ...inp, marginBottom:8 }} value={item.desc} onChange={e=>setEditItem(i,'desc',e.target.value)} placeholder="Description" />
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                            <div><span style={lbl}>Hours</span><input style={inp} type="number" value={item.hrs} onChange={e=>setEditItem(i,'hrs',e.target.value)} /></div>
                            <div><span style={lbl}>Qty</span><input style={inp} type="number" value={item.qty} step="0.5" onChange={e=>setEditItem(i,'qty',e.target.value)} /></div>
                            <div><span style={lbl}>Rate (INR)</span><input style={inp} type="number" value={item.rate} onChange={e=>setEditItem(i,'rate',e.target.value)} /></div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setEditInv(prev => prev ? { ...prev, items: [...prev.items, { desc:'', hrs:0, qty:1, rate:0 }] } : prev)}
                        style={{ fontFamily:'var(--mono)', fontSize:12, color:'#888', border:'1px dashed #2a2a2a', borderRadius:6, padding:'7px', background:'none', cursor:'pointer', width:'100%', marginBottom:16 }}
                      >+ Add item</button>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                        <div>
                          <span style={lbl}>Total (INR)</span>
                          <input style={{ ...inp, color:'#555' }} value={fmt(eTotal)} readOnly />
                        </div>
                        <div>
                          <span style={lbl}>Advance Paid (INR)</span>
                          <input style={inp} type="number" value={editInv.advance || ''} onChange={e => setEditField('advance', parseFloat(e.target.value) || 0)} placeholder="0" />
                        </div>
                        <div>
                          <span style={lbl}>Balance Due (INR)</span>
                          <input style={{ ...inp, color: eBalance > 0 ? '#E63946' : '#4caf50' }} value={fmt(eBalance)} readOnly />
                        </div>
                      </div>

                      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                        <button onClick={saveEdit} disabled={saving || resending} style={{ fontFamily:'var(--mono)', fontSize:12, color:'#fff', background:'#333', border:'none', padding:'9px 20px', borderRadius:6, cursor:'pointer', opacity:(saving||resending)?0.6:1 }}>
                          {saving ? 'Saving...' : 'Save changes'}
                        </button>
                        <button onClick={saveAndResend} disabled={saving || resending} style={{ fontFamily:'var(--mono)', fontSize:12, color:'#fff', background:'var(--brass)', border:'none', padding:'9px 20px', borderRadius:6, cursor:'pointer', opacity:(saving||resending)?0.6:1 }}>
                          {resending ? 'Resending...' : 'Save & resend PDF to client →'}
                        </button>
                        {saveMsg && <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#4caf50' }}>✓ {saveMsg}</p>}
                      </div>
                    </div>
                    );
                  })()}
                </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </>
      )}

      {/* ── TRASH ── */}
      {tab === 'trash' && (
        trashedInvoices.length === 0
          ? <p className={styles.empty}>Trash is empty.</p>
          : <div className={styles.list}>
              {trashedInvoices.map(inv => (
                <div key={inv.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardName}>{inv.client_name}</p>
                      <p className={styles.cardRole}>{inv.client_email}</p>
                      <p className={styles.cardCourse}>
                        Invoice #{inv.invoice_no} · {inv.date} · {inv.client_state}
                      </p>
                      {inv.deleted_at && (
                        <p style={{ fontSize:11, fontFamily:'var(--mono)', color:'#666', marginTop:6 }}>
                          Deleted {new Date(inv.deleted_at).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className={styles.cardMeta} style={{ textAlign:'right' }}>
                      <p className={styles.cardDate} style={{ fontWeight:700, fontSize:14, color:'#888' }}>INR {fmt(inv.total)}</p>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.approveBtn}
                      disabled={deletingId === inv.id}
                      onClick={() => restoreInvoice(inv.id)}
                    >
                      {deletingId === inv.id ? 'Restoring...' : 'Restore →'}
                    </button>
                    <button
                      className={styles.deleteBtn}
                      disabled={deletingId === inv.id}
                      onClick={() => permanentlyDeleteInvoice(inv.id)}
                    >
                      Delete forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* ── LOG ── */}
      {tab === 'log' && (
        <div>
          {logLoading && <p style={{ fontFamily:'var(--mono)', fontSize:13, color:'#888' }}>Loading...</p>}
          {!logLoading && logs.length === 0 && <div className={styles.empty}>No activity yet.</div>}
          {!logLoading && logs.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              {logs.map(l => {
                const eventColors: Record<string, string> = {
                  created: '#4caf50', edited: '#40c4ff', resent: '#40c4ff',
                  payment_updated: '#40c4ff', restored: '#4caf50',
                  queued: '#e5a935', retry_failed: '#e5a935',
                  recovered: '#4caf50', deleted: '#e55',
                };
                const color = eventColors[l.event] ?? '#888';
                return (
                  <div key={l.id} style={{
                    display:'flex', alignItems:'baseline', gap:14, padding:'10px 4px',
                    borderBottom:'1px solid #1a1a1a',
                  }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'#555', minWidth:118, flexShrink:0 }}>
                      {new Date(l.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                    <span style={{
                      fontFamily:'var(--mono)', fontSize:10, textTransform:'uppercase', letterSpacing:'.04em',
                      color, border:`1px solid ${color}55`, borderRadius:4, padding:'2px 7px', minWidth:96, textAlign:'center', flexShrink:0,
                    }}>
                      {l.event.replace('_', ' ')}
                    </span>
                    <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'#ccc', minWidth:130, flexShrink:0 }}>
                      {l.invoice_no}
                    </span>
                    <span style={{ fontFamily:'var(--body)', fontSize:13, color:'#999' }}>
                      {l.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE INVOICE ── */}
      {tab === 'create' && (
        <>
          {pendingJobIds.length > 0 && (
            <div style={{ background: '#1a1408', border: '1px solid var(--brass)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#d4b45a' }}>
              Pre-filled from {pendingJobIds.length} selected job{pendingJobIds.length > 1 ? 's' : ''} — double-check the <strong>State</strong> field below is correct for this client (it&apos;s not stored on the job/client record, so it defaults to Tamil Nadu and affects GST calculation).
            </div>
          )}
          {jobsLinked && (
            <div style={{ background: '#0d1f11', border: '1px solid #3fb950', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#7fd996' }}>
              Invoice sent, and the source job{items.length > 1 ? 's have' : ' has'} been marked as billed.
            </div>
          )}
          {/* Invoice type selector */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:24 }}>
            {([
              ['training',    'Training Invoice',    'For courses and masterclasses'],
              ['consultancy', 'Invoice',             'For consultancy and project work'],
              ['proforma',    'Proforma Invoice',    'Quote for student, no GST, PF- prefix'],
              ['test',        'Test Invoice',        'Prefills dummy data for preview'],
            ] as const).map(([t, label, hint]) => (
              <button key={t} onClick={() => {
                setInvoiceType(t);
                if (t === 'proforma') setF('invoice_no', `YAFT-PF-${mmyyyy}-${invoiceSeq.padStart(2,'0')}`);
                else if (t !== 'test') setF('invoice_no', `YAFT-${mmyyyy}-${invoiceSeq.padStart(2,'0')}`);
                if (t === 'test') applyTestData();
              }} style={{
                fontFamily:'var(--mono)', fontSize:12, padding:'10px 18px', borderRadius:8,
                border:'1px solid', cursor:'pointer', textAlign:'left' as const,
                borderColor: invoiceType===t ? 'var(--brass)' : '#2a2a2a',
                background:  invoiceType===t ? '#1a0808' : '#0d0d0d',
                color:       invoiceType===t ? 'var(--brass)' : '#666',
              }}>
                <span style={{ display:'block', fontWeight:600 }}>{label}</span>
                <span style={{ fontSize:10, color: invoiceType===t ? '#aa4a4a' : '#333', marginTop:2, display:'block' }}>{hint}</span>
              </button>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {/* LEFT */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <p style={sectionTitle}>Invoice details</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <span style={lbl}>Invoice No (auto)</span>
                  <div style={{ ...inp, color:'#555', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'var(--brass)' }}>{invoiceType === 'proforma' ? `YAFT-PF-${mmyyyy}-` : `YAFT-${mmyyyy}-`}</span>
                    <input
                      style={{ background:'transparent', border:'none', outline:'none', fontFamily:'var(--mono)', fontSize:13, color:'#fff', width:40 }}
                      value={invoiceSeq}
                      onChange={e => {
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setInvoiceSeq(digitsOnly);
                        const padded = digitsOnly.padStart(2, '0');
                        setF('invoice_no', invoiceType === 'proforma' ? `YAFT-PF-${mmyyyy}-${padded}` : `YAFT-${mmyyyy}-${padded}`);
                      }}
                      maxLength={3}
                    />
                  </div>
                  <p style={{ fontFamily:'var(--mono)', fontSize:10, color:'#444', marginTop:4 }}>{autoInvNo}</p>
                </div>
                <div><span style={lbl}>Date *</span><input style={inp} value={form.date} onChange={e=>setF('date',e.target.value)} /></div>
              </div>

              <p style={{ ...sectionTitle, marginTop:8 }}>Client details</p>

              <div>
                <span style={lbl}>Use existing client (optional)</span>
                <select
                  style={inp}
                  value={selectedClientId}
                  onChange={e => pickExistingClient(e.target.value)}
                >
                  <option value="">— Type details manually below —</option>
                  {clientOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ''}</option>
                  ))}
                </select>
                {selectedClientId && (
                  <p style={{ fontFamily:'var(--mono)', fontSize:10, color:'#666', marginTop:4 }}>
                    Filled from client register — edit any field below if it needs adjusting for this invoice.
                  </p>
                )}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                {['individual','company'].map(t => (
                  <button key={t} onClick={() => setF('client_type',t)} style={{
                    fontFamily:'var(--mono)', fontSize:12, padding:'6px 16px', borderRadius:6,
                    border:'1px solid', cursor:'pointer',
                    borderColor: form.client_type===t ? 'var(--brass)' : '#2a2a2a',
                    background:  form.client_type===t ? '#1a0808' : 'transparent',
                    color:       form.client_type===t ? 'var(--brass)' : '#888',
                  }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
                ))}
              </div>

              <div><span style={lbl}>Client Name *</span><input style={inp} value={form.client_name} onChange={e=>setF('client_name',e.target.value)} placeholder="Ar. Ramanjit Singh" /></div>
              <div><span style={lbl}>Email *</span><input style={inp} value={form.client_email} onChange={e=>setF('client_email',e.target.value)} placeholder="client@email.com" /></div>

              {form.client_type==='company' && <>
                <div><span style={lbl}>Company Name</span><input style={inp} value={form.client_company} onChange={e=>setF('client_company',e.target.value)} placeholder="Company Pvt Ltd" /></div>
                <div><span style={lbl}>GST Number</span><input style={inp} value={form.client_gst} onChange={e=>setF('client_gst',e.target.value)} placeholder="29XXXXX1234X1ZX" /></div>
              </>}

              <div><span style={lbl}>Address</span><textarea style={{ ...inp, minHeight:56 }} value={form.client_address} onChange={e=>setF('client_address',e.target.value)} placeholder="Street, City, State, PIN" /></div>
              <div><span style={lbl}>Phone Number</span><input style={inp} value={form.client_phone} onChange={e=>setF('client_phone',e.target.value)} placeholder="+91 98765 43210" /></div>

              {form.client_type==='individual' && (
                <div><span style={lbl}>PAN ID</span><input style={inp} value={form.client_pan} onChange={e=>setF('client_pan',e.target.value)} placeholder="ABCDE1234F" /></div>
              )}

              <div>
                <span style={lbl}>State / Country (for GST)</span>
                <select style={inp} value={form.client_state} onChange={e=>setF('client_state',e.target.value)}>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Advance + Balance */}
              <p style={{ ...sectionTitle, marginTop:8 }}>Payment</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <span style={lbl}>Advance Paid (INR)</span>
                  <input style={inp} type="number" value={advance||''} onChange={e=>setAdvance(parseFloat(e.target.value)||0)} placeholder="0" />
                </div>
                <div>
                  <span style={lbl}>Balance Due (INR)</span>
                  <input style={{ ...inp, background:'#0a0a0a', color: balance>0 ? '#E63946' : '#555' }} value={fmt(balance)} readOnly />
                </div>
              </div>

              {invoiceType === 'proforma' && (
                <div>
                  <span style={lbl}>Training Schedule (shown in the proforma email under &quot;Schedule&quot;)</span>
                  <textarea
                    style={{ ...inp, minHeight:70 }}
                    value={form.schedule_note}
                    onChange={e=>setF('schedule_note',e.target.value)}
                    placeholder={'e.g. 3 sessions/week (Mon, Wed, Fri), 3 hrs/session (~10 hrs/week)'}
                  />
                  <p style={{ fontFamily:'var(--mono)', fontSize:10, color:'#666', marginTop:4 }}>
                    The 50% advance-to-book banner and the recording policy ({form.client_type==='company' ? 'all attendees may record' : 'participant may record for personal reference only'}) are added automatically — no need to type those here.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT — items + totals */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <p style={sectionTitle}>Line items</p>
              {items.map((item,i) => (
                <div key={i} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#555' }}>Item {i+1}</span>
                    {items.length>1 && <button onClick={()=>setItems(p=>p.filter((_,idx)=>idx!==i))} style={{ fontFamily:'var(--mono)', fontSize:11, color:'#e55', background:'none', border:'none', cursor:'pointer' }}>Remove</button>}
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <span style={lbl}>Description</span>
                    <select style={inp} value={item.desc} onChange={e=>setItem(i,'desc',e.target.value)}>
                      <option value="">Select course...</option>
                      {COURSES.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input style={{ ...inp, marginTop:6 }} value={item.desc} onChange={e=>setItem(i,'desc',e.target.value)} placeholder="Or type custom description" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    <div><span style={lbl}>Hours</span><input style={inp} type="number" value={item.hrs} onChange={e=>setItem(i,'hrs',e.target.value)} /></div>
                    <div><span style={lbl}>Qty</span><input style={inp} type="number" value={item.qty} step="0.5" onChange={e=>setItem(i,'qty',e.target.value)} /></div>
                    <div><span style={lbl}>Rate (INR)</span><input style={inp} type="number" value={item.rate} onChange={e=>setItem(i,'rate',e.target.value)} /></div>
                  </div>
                  <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'#555', marginTop:8, textAlign:'right' }}>Subtotal: INR {fmt(item.rate*item.qty)}</p>
                </div>
              ))}
              <button onClick={()=>setItems(p=>[...p,{desc:'',hrs:0,qty:1,rate:0}])} style={{ fontFamily:'var(--mono)', fontSize:12, color:'#888', border:'1px dashed #2a2a2a', borderRadius:6, padding:'8px', background:'none', cursor:'pointer' }}>+ Add item</button>

              {/* Summary */}
              <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:16 }}>
                <p style={{ ...sectionTitle, marginBottom:12 }}>Summary</p>
                {[
                  ['Subtotal', fmt(subtotal)],
                  ...(intra ? [['CGST 9%',fmt(cgst)],['SGST 9%',fmt(sgst)]] : igst ? [['IGST 18%',fmt(igst)]] : [['GST','N/A']]),
                ].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:12, color:'#777', marginBottom:6 }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid #222', paddingTop:10, marginTop:6, display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:14, fontWeight:600, color:'#fff' }}>
                  <span>TOTAL</span><span>INR {fmt(grandTotal)}</span>
                </div>
                {advance > 0 && <>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:12, color:'#555', marginTop:8 }}><span>Advance Paid</span><span>INR {fmt(advance)}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--mono)', fontSize:13, fontWeight:600, color:'#E63946', marginTop:4 }}><span>Balance Due</span><span>INR {fmt(balance)}</span></div>
                </>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop:28, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={generate} disabled={sending} style={{
              fontFamily:'var(--mono)', fontSize:12, color:'#fff', background:'var(--brass)',
              border:'none', padding:'11px 24px', borderRadius:6, cursor:'pointer', opacity:sending?0.6:1,
            }}>{sending ? 'Generating...' : invoiceType === 'proforma' ? 'Generate & Send Proforma →' : 'Generate & Send PDF →'}</button>

            {pdfUrl && (
              <a href={pdfUrl} download={`YAFT_Invoice_${form.invoice_no}.pdf`} style={{
                fontFamily:'var(--mono)', fontSize:12, color:'var(--brass)',
                border:'1px solid var(--brass)', padding:'10px 20px', borderRadius:6, textDecoration:'none',
              }}>Download PDF</a>
            )}
            {done  && <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#4caf50' }}>✓ {invoiceType === 'proforma' ? 'Proforma' : 'Invoice'} sent to {form.client_email}</p>}
            {formError && <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>{formError}</p>}
          </div>
        </>
      )}
    </div>
  );
}
