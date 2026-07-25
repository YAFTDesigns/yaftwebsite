'use client';

import { useEffect, useState } from 'react';
import styles from '../../testimonials/testimonials.module.css';

const API = '/api/admin/projects';

type GalleryItem = { filename: string; caption: string };

type Project = {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  client_or_collab: string | null;
  year: number | null;
  summary: string;
  description: string;
  cover_image_path: string | null;
  gallery: GalleryItem[];
  display_order: number;
  featured: boolean;
  active: boolean;
};

const CATEGORY_OPTIONS = [
  { key: 'facade', label: 'Facade' },
  { key: 'bim-automation', label: 'BIM automation' },
  { key: 'computational-design', label: 'Computational design' },
  { key: 'wearables', label: 'Wearables' },
  { key: 'product', label: 'Product' },
];

const EMPTY_DRAFT = {
  slug: '', title: '', category: 'facade', location: '', client_or_collab: '', year: '',
  summary: '', description: '', cover_image_path: '', display_order: '0',
  featured: false, active: false, gallery: [] as GalleryItem[],
};

type Draft = typeof EMPTY_DRAFT;

const inputStyle: React.CSSProperties = {
  background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 4,
  color: 'var(--ink)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 13, width: '100%',
};

const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'var(--sans, inherit)' };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function draftFromProject(p: Project): Draft {
  return {
    slug: p.slug, title: p.title, category: p.category, location: p.location,
    client_or_collab: p.client_or_collab ?? '', year: p.year ? String(p.year) : '',
    summary: p.summary, description: p.description, cover_image_path: p.cover_image_path ?? '',
    display_order: String(p.display_order), featured: p.featured, active: p.active,
    gallery: p.gallery ?? [],
  };
}

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(API);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed to load'); setItems([]); }
    else { setError(null); setItems(json.data ?? []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setDraft(draftFromProject(p));
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateGalleryRow(index: number, field: keyof GalleryItem, value: string) {
    setDraft(d => {
      const gallery = [...d.gallery];
      gallery[index] = { ...gallery[index], [field]: value };
      return { ...d, gallery };
    });
  }

  function addGalleryRow() {
    setDraft(d => ({ ...d, gallery: [...d.gallery, { filename: '', caption: '' }] }));
  }

  function removeGalleryRow(index: number) {
    setDraft(d => ({ ...d, gallery: d.gallery.filter((_, i) => i !== index) }));
  }

  async function save() {
    if (!draft.title || !draft.location || !draft.summary || !draft.description) {
      alert('Title, location, summary, and description are required.');
      return;
    }
    setSaving(true);
    const payload = {
      ...draft,
      client_or_collab: draft.client_or_collab || null,
      cover_image_path: draft.cover_image_path || null,
      year: draft.year ? Number(draft.year) : null,
      display_order: Number(draft.display_order) || 0,
      gallery: draft.gallery.filter(g => g.filename.trim()),
      slug: draft.slug ? slugify(draft.slug) : slugify(draft.title),
    };

    const res = editingId
      ? await fetch(API, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
      : await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    const json = await res.json();
    setSaving(false);
    if (!res.ok) { alert(json.error ?? 'Failed to save'); return; }
    setFormOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    await load();
  }

  async function toggleField(p: Project, field: 'active' | 'featured') {
    setBusyId(p.id);
    await fetch(API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, [field]: !p[field] }),
    });
    await load();
    setBusyId(null);
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    await fetch(API, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
    await load();
    setBusyId(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.sub}>Manage the portfolio shown at /projects. Inactive projects stay hidden from the public site until you activate them.</p>
        </div>
        <a href="/admin" className={styles.back}>← Back to admin</a>
      </div>

      {!formOpen && (
        <button className={styles.approveBtn} onClick={startCreate} style={{ marginBottom: 24 }}>
          + Add new project
        </button>
      )}

      {formOpen && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 20, marginBottom: 32, display: 'grid', gap: 10, background: 'var(--paper-2)' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', margin: 0 }}>
            {editingId ? 'Editing project' : 'New project'}
          </p>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
            <input style={inputStyle} placeholder="Title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
            <input style={inputStyle} placeholder="Slug (auto from title if blank)" value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))} />
            <select style={inputStyle} value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
              {CATEGORY_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <input style={inputStyle} placeholder="Location, e.g. India" value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} />
            <input style={inputStyle} placeholder="Client / collaborator (optional)" value={draft.client_or_collab} onChange={e => setDraft(d => ({ ...d, client_or_collab: e.target.value }))} />
            <input style={inputStyle} placeholder="Year (optional)" value={draft.year} onChange={e => setDraft(d => ({ ...d, year: e.target.value }))} />
          </div>

          <textarea style={textareaStyle} placeholder="Summary (short, shown on the card)" value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} />
          <textarea style={textareaStyle} placeholder="Description (fallback caption if no gallery)" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />

          <input style={inputStyle} placeholder="Cover image path, e.g. /assets/images/projects/x/cover.jpg or a Supabase storage path" value={draft.cover_image_path} onChange={e => setDraft(d => ({ ...d, cover_image_path: e.target.value }))} />

          <div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', margin: '4px 0 8px' }}>Gallery images</p>
            {draft.gallery.map((g, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                <input style={inputStyle} placeholder="Image path" value={g.filename} onChange={e => updateGalleryRow(i, 'filename', e.target.value)} />
                <input style={inputStyle} placeholder="Caption" value={g.caption} onChange={e => updateGalleryRow(i, 'caption', e.target.value)} />
                <button className={styles.rejectBtn} onClick={() => removeGalleryRow(i)}>Remove</button>
              </div>
            ))}
            <button className={styles.rejectBtn} onClick={addGalleryRow}>+ Add gallery image</button>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 12 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={draft.active} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} />
              Active (visible on the public site)
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={draft.featured} onChange={e => setDraft(d => ({ ...d, featured: e.target.checked }))} />
              Featured
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              Order:
              <input style={{ ...inputStyle, width: 60 }} value={draft.display_order} onChange={e => setDraft(d => ({ ...d, display_order: e.target.value }))} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className={styles.approveBtn} disabled={saving} onClick={save}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create project'}
            </button>
            <button className={styles.rejectBtn} onClick={() => { setFormOpen(false); setEditingId(null); setDraft(EMPTY_DRAFT); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'var(--brass)' }}>{error}</p>}
      {!loading && items.length === 0 && <div className={styles.empty}>No projects yet.</div>}

      <div className={styles.list}>
        {items.map(p => (
          <div key={p.id} className={styles.card} style={{ opacity: p.active ? 1 : 0.55 }}>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{p.title}{p.featured && ' ⭐'}</span>
              <span className={styles.cardMeta}>
                {p.category} · {p.location} {p.year ? `· ${p.year}` : ''} · {p.active ? 'Active' : 'Inactive'} · {p.gallery?.length ?? 0} gallery images
              </span>
            </div>
            <p style={{ fontFamily: 'var(--sans, inherit)', fontSize: 13, color: 'var(--ink-soft)', margin: '4px 0' }}>{p.summary}</p>
            <div className={styles.actions}>
              <button className={styles.approveBtn} disabled={busyId === p.id} onClick={() => startEdit(p)}>Edit</button>
              <button className={styles.rejectBtn} disabled={busyId === p.id} onClick={() => toggleField(p, 'active')}>
                {p.active ? 'Deactivate' : 'Activate'}
              </button>
              <button className={styles.rejectBtn} disabled={busyId === p.id} onClick={() => toggleField(p, 'featured')}>
                {p.featured ? 'Unfeature' : 'Feature'}
              </button>
              <button className={styles.rejectBtn} disabled={busyId === p.id} onClick={() => remove(p)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
