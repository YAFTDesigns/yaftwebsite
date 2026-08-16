'use client';

import { useState, useEffect } from 'react';
import styles from '@/components/admin/adminPage.module.css';
import { getErrorMessage } from '@/lib/errorMessage';

type Photo = { filename?: string; caption: string };
type Workshop = {
  id: string; key: string; num: string; place: string; title: string;
  role: string; description: string; photos: Photo[]; display_order: number; active: boolean;
};

const SITE_IMAGE_BASE = 'https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/site-images/workshops/';

const EMPTY_NEW = { key: '', num: '', place: '', title: '', role: '', description: '' };
const EMPTY_EDIT = { num: '', place: '', title: '', role: '', description: '' };

export default function WorkshopsClient({ initialWorkshops }: { initialWorkshops?: Workshop[] }) {
  const hasInitialData = initialWorkshops !== undefined;
  const [workshops, setWorkshops] = useState<Workshop[]>(initialWorkshops ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadError, setLoadError] = useState('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [captionDraft, setCaptionDraft] = useState<Record<string, string>>({});

  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [newSaving, setNewSaving] = useState(false);
  const [newError, setNewError] = useState('');

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/workshops');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load');
      setWorkshops(json.workshops ?? []);
    } catch {
      setLoadError('Could not load workshops.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasInitialData) return;
    load();
  }, [hasInitialData]);

  async function uploadPhoto(key: string, file: File) {
    const caption = (captionDraft[key] ?? '').trim();
    if (!caption) {
      setUploadError(e => ({ ...e, [key]: 'Add a caption before uploading.' }));
      return;
    }
    setUploadingKey(key);
    setUploadError(e => ({ ...e, [key]: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('caption', caption);
      const res = await fetch(`/api/admin/workshops/${key}/photos`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Upload failed');
      setCaptionDraft(d => ({ ...d, [key]: '' }));
      await load();
    } catch (err) {
      setUploadError(e => ({ ...e, [key]: getErrorMessage(err) || 'Upload failed' }));
    } finally {
      setUploadingKey(null);
    }
  }

  async function removePhoto(key: string, index: number) {
    if (!confirm('Remove this photo from the workshop entry?')) return;
    await fetch(`/api/admin/workshops/${key}/photos?index=${index}`, { method: 'DELETE' });
    await load();
  }

  function openNewForm() {
    setNewForm(EMPTY_NEW);
    setNewError('');
    setShowNewForm(true);
  }

  async function submitNew() {
    if (!newForm.key.trim()) { setNewError('A short key is required (e.g. "srm", "vit").'); return; }
    if (!newForm.place.trim()) { setNewError('Place is required.'); return; }
    if (!newForm.title.trim()) { setNewError('Title is required.'); return; }
    setNewSaving(true);
    setNewError('');
    try {
      const res = await fetch('/api/admin/workshops', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setShowNewForm(false);
      await load();
    } catch (err) {
      setNewError(getErrorMessage(err) || 'Save failed');
    } finally {
      setNewSaving(false);
    }
  }

  function openEdit(w: Workshop) {
    setEditingKey(w.key);
    setEditForm({ num: w.num, place: w.place, title: w.title, role: w.role, description: w.description });
    setEditError('');
  }

  async function saveEdit(key: string) {
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch('/api/admin/workshops', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, ...editForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setEditingKey(null);
      await load();
    } catch (err) {
      setEditError(getErrorMessage(err) || 'Save failed');
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleActive(w: Workshop) {
    await fetch('/api/admin/workshops', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: w.key, active: !w.active }),
    });
    await load();
  }

  const fieldStyle = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#ddd', fontSize: 13, width: '100%' };
  const labelStyle = { display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workshops</h1>
          <p className={styles.sub}>Manage the institutional workshop entries shown on /services.</p>
        </div>
        <button onClick={openNewForm} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New workshop
        </button>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : loadError ? (
        <p className={styles.empty}>{loadError}</p>
      ) : (
        <div className={styles.list}>
          {workshops.map(w => (
            <div className={styles.card} key={w.key} style={{ opacity: w.active ? 1 : 0.55 }}>
              {editingKey === w.key ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={labelStyle}>No.</label><input style={fieldStyle} value={editForm.num} onChange={e => setEditForm(f => ({ ...f, num: e.target.value }))} /></div>
                    <div><label style={labelStyle}>Place</label><input style={fieldStyle} value={editForm.place} onChange={e => setEditForm(f => ({ ...f, place: e.target.value }))} /></div>
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={labelStyle}>Title</label><input style={fieldStyle} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div style={{ marginBottom: 10 }}><label style={labelStyle}>Role</label><input style={fieldStyle} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} /></div>
                  <div style={{ marginBottom: 10 }}><label style={labelStyle}>Description</label><textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
                  {editError && <p style={{ fontSize: 12, color: '#E63946', marginBottom: 10 }}>{editError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingKey(null)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => saveEdit(w.key)} disabled={editSaving} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}>
                      {editSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.cardTop}>
                  <div>
                    <p className={styles.cardName}>{w.num} · {w.title}{!w.active && <span style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>INACTIVE</span>}</p>
                    <p className={styles.cardRole}>{w.role}</p>
                    <p className={styles.cardCourse}>{w.place}</p>
                  </div>
                  <div className={styles.actions} style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(w)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>Edit details</button>
                    <button onClick={() => toggleActive(w)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                      {w.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              )}

              {editingKey !== w.key && w.description && <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>{w.description}</p>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                {w.photos.map((p, i) => (
                  <div key={p.filename ?? `placeholder-${i}`} style={{ position: 'relative', width: 100 }}>
                    {p.filename ? (
                      <img
                        src={`${SITE_IMAGE_BASE}${p.filename}`}
                        alt={p.caption}
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #2a2a2a', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: 100, height: 100, borderRadius: 6, border: '1px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 22 }}>
                        ▢
                      </div>
                    )}
                    <p style={{ fontSize: 10, color: '#777', marginTop: 4, lineHeight: 1.3 }}>{p.caption}</p>
                    <button
                      onClick={() => removePhoto(w.key, i)}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#E63946', borderRadius: 4, width: 20, height: 20, fontSize: 12, cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2a2a', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Caption for next upload"
                  value={captionDraft[w.key] ?? ''}
                  onChange={e => setCaptionDraft(d => ({ ...d, [w.key]: e.target.value }))}
                  style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', color: '#ddd', fontSize: 12, flex: '1 1 200px' }}
                />
                <label style={{ background: 'var(--brass)', color: '#0a0a0a', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: uploadingKey === w.key ? 0.6 : 1 }}>
                  {uploadingKey === w.key ? 'Uploading...' : 'Add photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={uploadingKey === w.key}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(w.key, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {uploadError[w.key] && <p style={{ fontSize: 12, color: '#E63946', marginTop: 8 }}>{uploadError[w.key]}</p>}
            </div>
          ))}
        </div>
      )}

      {showNewForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 460, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>New workshop entry</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Key (short, no spaces — e.g. &quot;iim-b&quot;)</label>
              <input style={fieldStyle} value={newForm.key} onChange={e => setNewForm(f => ({ ...f, key: e.target.value }))} placeholder="e.g. iim-b" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 10, marginBottom: 12 }}>
              <div><label style={labelStyle}>No.</label><input style={fieldStyle} value={newForm.num} onChange={e => setNewForm(f => ({ ...f, num: e.target.value }))} placeholder="auto" /></div>
              <div><label style={labelStyle}>Place</label><input style={fieldStyle} value={newForm.place} onChange={e => setNewForm(f => ({ ...f, place: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Title</label>
              <input style={fieldStyle} value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Role</label>
              <input style={fieldStyle} value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Workshop: Rhino + Grasshopper" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={3} value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {newError && <p style={{ fontSize: 12, color: '#E63946', marginBottom: 12 }}>{newError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNewForm(false)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitNew} disabled={newSaving} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: newSaving ? 0.6 : 1 }}>
                {newSaving ? 'Saving...' : 'Add workshop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
