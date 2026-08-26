'use client';

import { useState } from 'react';
import styles from '@/components/admin/adminPage.module.css';
import { getErrorMessage } from '@/lib/errorMessage';

type Script = {
  id: string; title: string; description: string; tool: string;
  price: number; file_path: string | null; thumbnail_path: string | null;
  download_count: number; active: boolean; display_order: number;
};

const TOOLS = ['Grasshopper', 'Rhino', 'Rhino.Inside.Revit'];
const EMPTY_FORM = { title: '', description: '', tool: TOOLS[0], price: '0' };

export default function LabsClient({ initialScripts }: { initialScripts: Script[] }) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/lab-scripts');
    const json = await res.json();
    setScripts(json.scripts ?? []);
  }

  async function createScript() {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/admin/lab-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Script) {
    setBusyId(s.id);
    await fetch('/api/admin/lab-scripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    await load();
    setBusyId(null);
  }

  async function deleteScript(id: string) {
    if (!confirm('Delete this script? This removes the listing (the uploaded file stays in storage).')) return;
    setBusyId(id);
    await fetch('/api/admin/lab-scripts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    setBusyId(null);
  }

  async function uploadFile(id: string, file: File) {
    setUploadingId(id);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/admin/lab-scripts/${id}/file`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      await load();
    } catch (err) {
      alert(getErrorMessage(err) || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  async function uploadThumbnail(id: string, file: File) {
    setUploadingId(id);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/admin/lab-scripts/${id}/thumbnail`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      await load();
    } catch (err) {
      alert(getErrorMessage(err) || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>YAFT Labs</h1>
      <p className={styles.sub}>Free (and future paid) Grasshopper/Rhino scripts for the public /labs page.</p>

      <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:20, marginBottom:32 }}>
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--brass)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>New script</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <input
            type="text" placeholder="Title (e.g. Curve to Panel Grid)"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'9px 10px', color:'#ddd', fontSize:13 }}
          />
          <select
            value={form.tool} onChange={e => setForm(f => ({ ...f, tool: e.target.value }))}
            style={{ background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'9px 10px', color:'#ddd', fontSize:13 }}
          >
            {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <textarea
          placeholder="Short description -- what does it do?"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          style={{ width:'100%', minHeight:60, background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'9px 10px', color:'#ddd', fontSize:13, marginBottom:12, boxSizing:'border-box' }}
        />
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <div>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'#777' }}>Price (INR, 0 = free)</span>
            <input
              type="number" min="0" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              style={{ display:'block', width:120, background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'8px 10px', color:'#ddd', fontSize:13, marginTop:4 }}
            />
          </div>
          <button onClick={createScript} disabled={saving} style={{
            fontFamily:'var(--mono)', fontSize:12, color:'#fff', background:'var(--brass)',
            border:'none', padding:'10px 20px', borderRadius:6, cursor:'pointer', opacity:saving?0.6:1, marginTop:18,
          }}>{saving ? 'Saving...' : 'Add script →'}</button>
        </div>
        {formError && <p style={{ color:'#e55', fontSize:12, fontFamily:'var(--mono)', marginTop:10 }}>{formError}</p>}
      </div>

      {scripts.length === 0 ? (
        <p className={styles.empty}>No scripts yet -- add one above.</p>
      ) : (
        <div className={styles.list}>
          {scripts.map(s => (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardName}>{s.title} {!s.active && <span style={{ color:'#666', fontSize:11 }}>(hidden)</span>}</p>
                  <p className={styles.cardRole}>{s.tool} · {s.price > 0 ? `INR ${s.price}` : 'Free'} · {s.download_count} downloads</p>
                  <p className={styles.cardCourse}>{s.description}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
                <label style={{ fontFamily:'var(--mono)', fontSize:11, color: s.file_path ? '#4caf50' : '#E63946', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                  {uploadingId === s.id ? 'Uploading...' : s.file_path ? '✓ File uploaded (replace)' : 'Upload script file'}
                  <input type="file" hidden onChange={e => e.target.files?.[0] && uploadFile(s.id, e.target.files[0])} />
                </label>
                <label style={{ fontFamily:'var(--mono)', fontSize:11, color: s.thumbnail_path ? '#4caf50' : '#E63946', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                  {uploadingId === s.id ? 'Uploading...' : s.thumbnail_path ? '✓ Thumbnail uploaded (replace)' : 'Upload thumbnail'}
                  <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadThumbnail(s.id, e.target.files[0])} />
                </label>
                <button onClick={() => toggleActive(s)} disabled={busyId === s.id} style={{ fontFamily:'var(--mono)', fontSize:11, color:'#aaa', background:'transparent', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                  {s.active ? 'Hide from site' : 'Show on site'}
                </button>
                <button onClick={() => deleteScript(s.id)} disabled={busyId === s.id} className={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
