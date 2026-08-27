'use client';

import { useState } from 'react';
import styles from '@/components/admin/adminPage.module.css';
import { getErrorMessage } from '@/lib/errorMessage';

type Category = { id: string; name: string; display_order: number };
type Script = {
  id: string; title: string; description: string; tool: string; category_id: string | null;
  price: number; file_path: string | null; thumbnail_path: string | null; detail_image_path: string | null;
  download_count: number; view_count: number; active: boolean; display_order: number;
};

const EMPTY_FORM = { title: '', description: '', category_id: '', price: '0' };

export default function LabsClient({ initialScripts, initialCategories }: { initialScripts: Script[]; initialCategories: Category[] }) {
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [form, setForm] = useState({ ...EMPTY_FORM, category_id: initialCategories[0]?.id ?? '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catBusy, setCatBusy] = useState(false);

  async function load() {
    const [sRes, cRes] = await Promise.all([
      fetch('/api/admin/lab-scripts'),
      fetch('/api/admin/lab-categories'),
    ]);
    const sJson = await sRes.json();
    const cJson = await cRes.json();
    setScripts(sJson.scripts ?? []);
    setCategories(cJson.categories ?? []);
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    setCatBusy(true);
    try {
      const res = await fetch('/api/admin/lab-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed');
      setNewCategoryName('');
      await load();
    } catch (err) {
      alert(getErrorMessage(err) || 'Failed to add category');
    } finally {
      setCatBusy(false);
    }
  }

  async function renameCategory(id: string, name: string) {
    setCatBusy(true);
    await fetch('/api/admin/lab-categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    await load();
    setCatBusy(false);
  }

  // Swaps this category's display_order with its neighbor -- two PATCH
  // calls to the existing endpoint, no new backend action needed since
  // display_order was already settable.
  async function moveCategory(index: number, direction: -1 | 1) {
    const target = categories[index + direction];
    const current = categories[index];
    if (!target) return;
    setCatBusy(true);
    await Promise.all([
      fetch('/api/admin/lab-categories', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, display_order: target.display_order }),
      }),
      fetch('/api/admin/lab-categories', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, display_order: current.display_order }),
      }),
    ]);
    await load();
    setCatBusy(false);
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category? Scripts in it will become uncategorized, not deleted.')) return;
    setCatBusy(true);
    await fetch('/api/admin/lab-categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    setCatBusy(false);
  }

  async function createScript() {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    if (!form.category_id) { setFormError('Add a category first, then pick one.'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/admin/lab-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setForm({ ...EMPTY_FORM, category_id: form.category_id });
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function updateScriptCategory(scriptId: string, categoryId: string) {
    setBusyId(scriptId);
    await fetch('/api/admin/lab-scripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: scriptId, category_id: categoryId }),
    });
    await load();
    setBusyId(null);
  }

  function startEdit(s: Script) {
    setEditingId(s.id);
    setEditForm({ title: s.title, description: s.description });
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim()) { alert('Title cannot be empty.'); return; }
    if (!editForm.description.trim()) { alert('Description cannot be empty.'); return; }
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/lab-scripts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: editForm.title, description: editForm.description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setEditingId(null);
      await load();
    } catch (err) {
      alert(getErrorMessage(err) || 'Save failed');
    } finally {
      setBusyId(null);
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
    if (!confirm('Delete this script? This removes the listing (the uploaded files stay in storage).')) return;
    setBusyId(id);
    await fetch('/api/admin/lab-scripts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
    setBusyId(null);
  }

  async function uploadTo(endpoint: string, id: string, file: File) {
    setUploadingId(id);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      await load();
    } catch (err) {
      alert(getErrorMessage(err) || 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  }

  async function swapImages(s: Script) {
    setBusyId(s.id);
    await fetch('/api/admin/lab-scripts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, thumbnail_path: s.detail_image_path, detail_image_path: s.thumbnail_path }),
    });
    await load();
    setBusyId(null);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>YAFT Labs</h1>
      <p className={styles.sub}>Free (and future paid) Grasshopper/Rhino scripts for the public /labs page.</p>

      {/* Categories */}
      <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:20, marginBottom:24 }}>
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--brass)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Categories</p>
        <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'#666', marginBottom:14 }}>These become the numbered sections on the public page (&quot;1. Grasshopper&quot;, &quot;2. Rhino&quot;). Rename or reorder anytime -- changes apply immediately, even after scripts are published.</p>
        {categories.map((c, i) => (
          <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'#666', width:20 }}>{i + 1}.</span>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              <button onClick={() => moveCategory(i, -1)} disabled={catBusy || i === 0} title="Move up" style={{ fontFamily:'var(--mono)', fontSize:10, color: i === 0 ? '#333' : '#888', background:'transparent', border:'1px solid #2a2a2a', borderRadius:4, padding:'1px 6px', cursor: i === 0 ? 'default' : 'pointer', lineHeight:1.4 }}>▲</button>
              <button onClick={() => moveCategory(i, 1)} disabled={catBusy || i === categories.length - 1} title="Move down" style={{ fontFamily:'var(--mono)', fontSize:10, color: i === categories.length - 1 ? '#333' : '#888', background:'transparent', border:'1px solid #2a2a2a', borderRadius:4, padding:'1px 6px', cursor: i === categories.length - 1 ? 'default' : 'pointer', lineHeight:1.4 }}>▼</button>
            </div>
            <input
              defaultValue={c.name}
              onBlur={e => e.target.value.trim() && e.target.value !== c.name && renameCategory(c.id, e.target.value)}
              disabled={catBusy}
              style={{ flex:1, background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 10px', color:'#ddd', fontSize:13 }}
            />
            <button onClick={() => deleteCategory(c.id)} disabled={catBusy} className={styles.deleteBtn} style={{ padding:'6px 12px', fontSize:11 }}>Delete</button>
          </div>
        ))}
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <input
            placeholder="New category name (e.g. Rhino.Inside.Revit)"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            style={{ flex:1, background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'8px 10px', color:'#ddd', fontSize:13 }}
          />
          <button onClick={addCategory} disabled={catBusy} style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--brass)', background:'transparent', border:'1px solid var(--brass)', borderRadius:6, padding:'8px 16px', cursor:'pointer' }}>
            Add category
          </button>
        </div>
      </div>

      {/* New script */}
      <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:20, marginBottom:32 }}>
        <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--brass)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>New script</p>
        {categories.length === 0 ? (
          <p style={{ color:'#E63946', fontSize:12, fontFamily:'var(--mono)' }}>Add a category above first.</p>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <input
                type="text" placeholder="Title (e.g. Curve to Panel Grid)"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'9px 10px', color:'#ddd', fontSize:13 }}
              />
              <select
                value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                style={{ background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:6, padding:'9px 10px', color:'#ddd', fontSize:13 }}
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          </>
        )}
        {formError && <p style={{ color:'#e55', fontSize:12, fontFamily:'var(--mono)', marginTop:10 }}>{formError}</p>}
      </div>

      {scripts.length === 0 ? (
        <p className={styles.empty}>No scripts yet -- add one above.</p>
      ) : (
        <div className={styles.list}>
          {scripts.map(s => (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div style={{ flex: 1 }}>
                  {editingId === s.id ? (
                    <div style={{ marginBottom: 4 }}>
                      <input
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        style={{ width:'100%', background:'#0a0a0a', border:'1px solid var(--brass)', borderRadius:6, padding:'8px 10px', color:'#fff', fontSize:14, fontWeight:600, marginBottom:8, boxSizing:'border-box' }}
                      />
                      <textarea
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        style={{ width:'100%', minHeight:60, background:'#0a0a0a', border:'1px solid var(--brass)', borderRadius:6, padding:'8px 10px', color:'#ddd', fontSize:13, marginBottom:8, boxSizing:'border-box' }}
                      />
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => saveEdit(s.id)} disabled={busyId === s.id} style={{ fontFamily:'var(--mono)', fontSize:11, color:'#fff', background:'var(--brass)', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>
                          {busyId === s.id ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} disabled={busyId === s.id} style={{ fontFamily:'var(--mono)', fontSize:11, color:'#888', background:'transparent', border:'1px solid #2a2a2a', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={styles.cardName}>{s.title} {!s.active && <span style={{ color:'#666', fontSize:11 }}>(hidden)</span>}</p>
                      <p className={styles.cardRole}>
                        <select
                          value={s.category_id ?? ''}
                          onChange={e => updateScriptCategory(s.id, e.target.value)}
                          disabled={busyId === s.id}
                          style={{ background:'#0a0a0a', border:'1px solid #2a2a2a', borderRadius:4, padding:'2px 6px', color:'#aaa', fontSize:12, fontFamily:'var(--mono)' }}
                        >
                          {!s.category_id && <option value="">Uncategorized</option>}
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {' · '}{s.price > 0 ? `INR ${s.price}` : 'Free'} · {s.view_count} views · {s.download_count} downloads
                      </p>
                      <p className={styles.cardCourse}>{s.description}</p>
                    </>
                  )}
                </div>
                {editingId !== s.id && (
                  <button onClick={() => startEdit(s)} style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)', background:'transparent', border:'1px solid var(--brass)', borderRadius:6, padding:'6px 14px', cursor:'pointer', height:'fit-content' }}>
                    Edit
                  </button>
                )}
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
                <label style={{ fontFamily:'var(--mono)', fontSize:11, color: s.file_path ? '#4caf50' : '#E63946', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                  {uploadingId === s.id ? 'Uploading...' : s.file_path ? '✓ Script file (replace)' : 'Upload script file'}
                  <input type="file" hidden onChange={e => e.target.files?.[0] && uploadTo(`/api/admin/lab-scripts/${s.id}/file`, s.id, e.target.files[0])} />
                </label>
                <label style={{ fontFamily:'var(--mono)', fontSize:11, color: s.thumbnail_path ? '#4caf50' : '#E63946', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                  {uploadingId === s.id ? 'Uploading...' : s.thumbnail_path ? '✓ Grid thumbnail (replace)' : 'Upload grid thumbnail'}
                  <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadTo(`/api/admin/lab-scripts/${s.id}/thumbnail`, s.id, e.target.files[0])} />
                </label>
                <label style={{ fontFamily:'var(--mono)', fontSize:11, color: s.detail_image_path ? '#4caf50' : '#888', border:'1px solid #2a2a2a', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                  {uploadingId === s.id ? 'Uploading...' : s.detail_image_path ? '✓ Detail image (replace)' : 'Upload detail image (optional)'}
                  <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadTo(`/api/admin/lab-scripts/${s.id}/detail-image`, s.id, e.target.files[0])} />
                </label>
                {(s.thumbnail_path || s.detail_image_path) && (
                  <button onClick={() => swapImages(s)} disabled={busyId === s.id} title="Swap which image is the grid thumbnail vs. the detail image" style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)', background:'transparent', border:'1px solid var(--brass)', borderRadius:6, padding:'7px 12px', cursor:'pointer' }}>
                    ⇄ Swap thumbnail/detail
                  </button>
                )}
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
