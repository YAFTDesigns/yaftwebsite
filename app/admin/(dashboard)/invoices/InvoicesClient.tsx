'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../../../admin/testimonials/testimonials.module.css';
import PieChart from '@/components/admin/PieChart';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Item = { desc: string; hrs: number; qty: number; rate: number; };
type Invoice = {
  id: string; created_at: string; invoice_no: string; date: string;
  client_name: string; client_email: string; client_state: string;
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

export default function InvoicesClient() {
  const [tab, setTab] = useState<'create'|'sent'|'trash'>('create');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [trashedInvoices, setTrashedInvoices] = useState<Invoice[]>([]);
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
  });
  const [items, setItems] = useState<Item[]>([{ desc:'', hrs:0, qty:1, rate:0 }]);
  const [advance, setAdvance] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [formError, setFormError] = useState('');
  const [pdfUrl, setPdfUrl]   = useState('');

  const intra    = form.client_state.toLowerCase().includes('tamil');
  const intl     = ['australia','singapore','uae','oman','international'].includes(form.client_state.toLowerCase());
  const subtotal = items.reduce((s,i) => s + i.rate * i.qty, 0);
  const cgst     = (invoiceType !== 'proforma' && intra) ? subtotal*0.09 : 0;
  const sgst     = (invoiceType !== 'proforma' && intra) ? subtotal*0.09 : 0;
  const igst     = (invoiceType !== 'proforma' && !intra && !intl) ? subtotal*0.18 : 0;
  const grandTotal = subtotal + cgst + sgst + igst;
  const balance    = grandTotal - advance;

  function setF(k: string, v: string) { setForm(f => ({...f, [k]: v})); }
  function setItem(i: number, k: keyof Item, v: string) {
    setItems(prev => prev.map((it, idx) => idx===i ? {...it, [k]: k==='desc'?v:parseFloat(v)||0} : it));
  }

  const [editInv, setEditInv]   = useState<Invoice | null>(null);
  const [saving,  setSaving]    = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function saveEdit() {
    if (!editInv) return;
    setSaving(true); setSaveMsg('');
    const newBalance = editInv.total - editInv.advance;
    await supabase.from('invoices').update({ advance: editInv.advance, balance: newBalance }).eq('id', editInv.id);
    setEditInv({ ...editInv, balance: newBalance });
    await loadInvoices();
    setSaving(false); setSaveMsg('Saved');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Move this invoice to trash? You can restore it later from the Trash tab.')) return;
    setDeletingId(id);
    const { error } = await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('Failed to delete invoice:', error);
      alert(`Could not delete invoice: ${error.message}`);
    }
    if (editInv?.id === id) setEditInv(null);
    await loadInvoices();
    setDeletingId(null);
  }

  async function deleteAllMatching(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Move all ${ids.length} matching invoice${ids.length > 1 ? 's' : ''} to trash? You can restore them later from the Trash tab.`)) return;
    setDeletingId('bulk');
    const { error } = await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (error) {
      console.error('Failed to delete invoices:', error);
      alert(`Could not delete invoices: ${error.message}`);
    }
    setEditInv(null);
    await loadInvoices();
    setDeletingId(null);
  }

  async function restoreInvoice(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from('invoices').update({ deleted_at: null }).eq('id', id);
    if (error) {
      console.error('Failed to restore invoice:', error);
      alert(`Could not restore invoice: ${error.message}`);
    }
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
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load invoices:', error);
      setLoadError(error.message);
    } else {
      setLoadError('');
    }
    setInvoices(data ?? []);
  }

  async function loadTrash() {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (error) {
      console.error('Failed to load trash:', error);
      setLoadError(error.message);
    } else {
      setLoadError('');
    }
    setTrashedInvoices(data ?? []);
  }

  useEffect(() => {
    if (tab === 'sent') loadInvoices();
    if (tab === 'trash') loadTrash();
  }, [tab]);

  // Load trash count on mount too, so the tab badge is accurate
  // before the user ever visits the Trash tab themselves.
  useEffect(() => { loadTrash(); }, []);

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
    } catch (e: any) { setFormError(e.message ?? 'Something went wrong'); }
    setSending(false);
  }


  function applyTestData() {
    setForm({
      invoice_no: autoInvNo, date: today,
      client_name: 'Test Client', client_email: 'test@example.com',
      client_type: 'individual', client_pan: 'TESTPAN001',
      client_gst: '', client_company: '', client_state: 'Tamil Nadu',
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
              <div style={{ marginBottom: 12 }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by client name, email, or invoice number..."
                  style={{
                    background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:8,
                    padding:'10px 14px', fontFamily:'var(--mono)', fontSize:13, color:'#fff', width:'100%',
                  }}
                />
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
                      {filtered.length} invoice{filtered.length === 1 ? '' : 's'} match "{searchQuery}"
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
                  return <p className={styles.empty}>No invoices match "{searchQuery}".</p>;
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
                        {editInv?.id === inv.id ? 'Cancel' : 'Edit payment →'}
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
                  {editInv?.id === inv.id && (
                    <div style={{ background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:10, padding:20, marginTop:-1, marginBottom:8 }}>
                      <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>Update payment</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                        <div>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#888', marginBottom:5, display:'block' }}>Total (INR)</span>
                          <input style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:6, padding:'8px 12px', fontFamily:'var(--mono)', fontSize:13, color:'#555', width:'100%' }} value={fmt(editInv.total)} readOnly />
                        </div>
                        <div>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#888', marginBottom:5, display:'block' }}>Advance Paid (INR)</span>
                          <input
                            style={{ background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:6, padding:'8px 12px', fontFamily:'var(--mono)', fontSize:13, color:'#fff', width:'100%' }}
                            type="number"
                            value={editInv.advance || ''}
                            onChange={e => setEditInv({ ...editInv, advance: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#888', marginBottom:5, display:'block' }}>Balance Due (INR)</span>
                          <input style={{ background:'#0d0d0d', border:'1px solid #1e1e1e', borderRadius:6, padding:'8px 12px', fontFamily:'var(--mono)', fontSize:13, color: (editInv.total - editInv.advance) > 0 ? '#E63946' : '#4caf50', width:'100%' }} value={fmt(editInv.total - editInv.advance)} readOnly />
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <button onClick={saveEdit} disabled={saving} style={{ fontFamily:'var(--mono)', fontSize:12, color:'#fff', background:'var(--brass)', border:'none', padding:'9px 20px', borderRadius:6, cursor:'pointer', opacity:saving?0.6:1 }}>
                          {saving ? 'Saving...' : 'Save changes'}
                        </button>
                        {saveMsg && <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#4caf50' }}>✓ {saveMsg}</p>}
                      </div>
                    </div>
                  )}
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

      {/* ── CREATE INVOICE ── */}
      {tab === 'create' && (
        <>
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
                        setInvoiceSeq(e.target.value.padStart(2,'0'));
                        setF('invoice_no', `YAFT-${mmyyyy}-${e.target.value.padStart(2,'0')}`);
                      }}
                      maxLength={3}
                    />
                  </div>
                  <p style={{ fontFamily:'var(--mono)', fontSize:10, color:'#444', marginTop:4 }}>{autoInvNo}</p>
                </div>
                <div><span style={lbl}>Date *</span><input style={inp} value={form.date} onChange={e=>setF('date',e.target.value)} /></div>
              </div>

              <p style={{ ...sectionTitle, marginTop:8 }}>Client details</p>
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
