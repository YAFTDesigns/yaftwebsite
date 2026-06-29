'use client';

import { useState } from 'react';
import styles from '../../../admin/testimonials/testimonials.module.css';

type Item = { desc: string; hrs: number; qty: number; rate: number; };

const COURSES = [
  'Rhino3D for Architecture',
  'Rhino3D for AEC & Climate Design',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Wearables & Product Design',
  'Custom Training',
];

const STATES = [
  'Tamil Nadu','Andhra Pradesh','Karnataka','Kerala','Maharashtra','Delhi',
  'Gujarat','Rajasthan','Telangana','West Bengal','Other',
  'Australia','Singapore','UAE','Oman','International',
];

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function InvoicesClient() {
  const today = new Date().toLocaleDateString('en-GB').split('/').join('/');
  const [form, setForm] = useState({
    invoice_no: '',
    date: today,
    client_name: '',
    client_email: '',
    client_type: 'individual',
    client_pan: '',
    client_gst: '',
    client_company: '',
    client_state: 'Tamil Nadu',
  });
  const [items, setItems] = useState<Item[]>([{ desc: '', hrs: 0, qty: 1, rate: 0 }]);
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [pdfUrl, setPdfUrl]   = useState('');

  const intra = form.client_state.toLowerCase().includes('tamil');
  const subtotal   = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const cgst = intra ? subtotal * 0.09 : 0;
  const sgst = intra ? subtotal * 0.09 : 0;
  const igst = !intra && !['australia','singapore','uae','oman','international'].includes(form.client_state.toLowerCase())
    ? subtotal * 0.18 : 0;
  const grandTotal = subtotal + cgst + sgst + igst;

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function setItem(i: number, k: keyof Item, v: string) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: k === 'desc' ? v : parseFloat(v) || 0 } : it));
  }

  function addItem() { setItems(p => [...p, { desc: '', hrs: 0, qty: 1, rate: 0 }]); }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)); }

  async function generate() {
    setError(''); setSending(true); setDone(false);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items, grand_total: grandTotal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      // Create download link
      const blob = new Blob([Buffer.from(json.pdf, 'base64')], { type: 'application/pdf' });
      setPdfUrl(URL.createObjectURL(blob));
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    }
    setSending(false);
  }

  const inp: React.CSSProperties = {
    background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6,
    padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 13,
    color: '#fff', width: '100%',
  };
  const label: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: 11, color: '#888', marginBottom: 5, display: 'block',
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Generate Invoice</h1>
          <p className={styles.sub}>Fill in details, preview the total, then generate and send PDF.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* LEFT — client details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Invoice details</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><span style={label}>Invoice No *</span><input style={inp} value={form.invoice_no} onChange={e => setF('invoice_no', e.target.value)} placeholder="001" /></div>
            <div><span style={label}>Date *</span><input style={inp} type="text" value={form.date} onChange={e => setF('date', e.target.value)} /></div>
          </div>

          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 8 }}>Client details</p>

          <div style={{ display: 'flex', gap: 10 }}>
            {['individual','company'].map(t => (
              <button key={t} onClick={() => setF('client_type', t)} style={{
                fontFamily: 'var(--mono)', fontSize: 12, padding: '6px 16px', borderRadius: 6,
                border: '1px solid', cursor: 'pointer',
                borderColor: form.client_type === t ? 'var(--brass)' : '#2a2a2a',
                background: form.client_type === t ? '#1a0808' : 'transparent',
                color: form.client_type === t ? 'var(--brass)' : '#888',
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <div><span style={label}>Client Name *</span><input style={inp} value={form.client_name} onChange={e => setF('client_name', e.target.value)} placeholder="Ar. Ramanjit Singh" /></div>
          <div><span style={label}>Email *</span><input style={inp} value={form.client_email} onChange={e => setF('client_email', e.target.value)} placeholder="client@email.com" /></div>

          {form.client_type === 'company' && (
            <>
              <div><span style={label}>Company Name</span><input style={inp} value={form.client_company} onChange={e => setF('client_company', e.target.value)} placeholder="Company Pvt Ltd" /></div>
              <div><span style={label}>GST Number</span><input style={inp} value={form.client_gst} onChange={e => setF('client_gst', e.target.value)} placeholder="29XXXXX1234X1ZX" /></div>
            </>
          )}

          {form.client_type === 'individual' && (
            <div><span style={label}>PAN ID</span><input style={inp} value={form.client_pan} onChange={e => setF('client_pan', e.target.value)} placeholder="ABCDE1234F" /></div>
          )}

          <div>
            <span style={label}>State / Country (for GST)</span>
            <select style={inp} value={form.client_state} onChange={e => setF('client_state', e.target.value)}>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* RIGHT — line items + totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Line items</p>

          {items.map((item, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#555' }}>Item {i+1}</span>
                {items.length > 1 && <button onClick={() => removeItem(i)} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#e55', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>}
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={label}>Description</span>
                <select style={inp} value={item.desc} onChange={e => setItem(i, 'desc', e.target.value)}>
                  <option value="">Select course...</option>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input style={{ ...inp, marginTop: 6 }} value={item.desc} onChange={e => setItem(i, 'desc', e.target.value)} placeholder="Or type custom description" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div><span style={label}>Hours</span><input style={inp} type="number" value={item.hrs} onChange={e => setItem(i, 'hrs', e.target.value)} /></div>
                <div><span style={label}>Qty</span><input style={inp} type="number" value={item.qty} step="0.5" onChange={e => setItem(i, 'qty', e.target.value)} /></div>
                <div><span style={label}>Rate (INR)</span><input style={inp} type="number" value={item.rate} onChange={e => setItem(i, 'rate', e.target.value)} /></div>
              </div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#555', marginTop: 8, textAlign: 'right' }}>
                Subtotal: INR {fmt(item.rate * item.qty)}
              </p>
            </div>
          ))}

          <button onClick={addItem} style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#888', border: '1px dashed #2a2a2a', borderRadius: 6, padding: '8px', background: 'none', cursor: 'pointer' }}>
            + Add item
          </button>

          {/* Summary */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: 16 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#555', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Summary</p>
            {[
              ['Subtotal', fmt(subtotal)],
              ...(intra ? [['CGST 9%', fmt(cgst)], ['SGST 9%', fmt(sgst)]] : igst ? [['IGST 18%', fmt(igst)]] : [['GST', 'N/A (International)']]),
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 12, color: '#777', marginBottom: 6 }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #222', paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: '#fff' }}>
              <span>TOTAL</span><span>INR {fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 28, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={generate} disabled={sending} style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: '#fff',
          background: 'var(--brass)', border: 'none', padding: '11px 24px',
          borderRadius: 6, cursor: 'pointer', opacity: sending ? 0.6 : 1,
        }}>
          {sending ? 'Generating...' : 'Generate & Send PDF →'}
        </button>

        {pdfUrl && (
          <a href={pdfUrl} download={`YAFT_Invoice_${form.invoice_no}.pdf`} style={{
            fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--brass)',
            border: '1px solid var(--brass)', padding: '10px 20px',
            borderRadius: 6, textDecoration: 'none',
          }}>
            Download PDF
          </a>
        )}

        {done && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#4caf50' }}>✓ Invoice sent to {form.client_email}</p>}
        {error && <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#e55' }}>{error}</p>}
      </div>
    </div>
  );
}
