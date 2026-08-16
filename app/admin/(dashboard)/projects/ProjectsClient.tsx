'use client';

import { useEffect, useState } from 'react';
import styles from '@/components/admin/adminPage.module.css';

const API = '/api/admin/projects';

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
  display_order: number;
  featured: boolean;
  active: boolean;
};

const CATEGORIES = ['facade', 'bim-automation', 'computational-design', 'wearables', 'product'];

const EMPTY_DRAFT = {
  slug: '', title: '', category: 'facade', location: '', client_or_collab: '',
  year: '', summary: '', description: '', display_order: '0',
};

async function apiGet() {
  const res = await fetch(API);
  const json = await res.json();
  if (!res.ok) return { data: [], error: json.error ?? 'Request failed' };
  return { data: json.data ?? [], error: null };
}

async function apiPatch(id: string, fields: Partial<Project>) {
  const res = await fetch(API, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...fields }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'Request failed' };
  return { error: null };
}

async function apiDelete(id: string) {
  const res = await fetch(API, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'Request failed' };
  return { error: null };
}

async function apiCreate(body: Record<string, unknown>) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'Request failed' };
  return { error: null };
}

const inputStyle: React.CSSProperties = {
  background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 4,
  color: 'var(--ink)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 13, width: '100%',
};

export default function AdminProjectsPage({ initialItems }: { initialItems?: Project[] }) {
  const hasInitialData = initialItems !== undefined;
  const [items, setItems] = useState<Project[]>(initialItems ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await apiGet();
    setItems(data);
    setError(error);
    setLoading(false);
  }

  useEffect(() => {
    if (hasInitialData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount unless server already provided the data, not a cascading-render bug
    load();
  }, []);

  async function toggleActive(p: Project) {
    setBusyId(p.id);
    await apiPatch(p.id, { active: !p.active });
    await load();
    setBusyId(null);
  }

  async function toggleFeatured(p: Project) {
    setBusyId(p.id);
    await apiPatch(p.id, { featured: !p.featured });
    await load();
    setBusyId(null);
  }

  async function saveField(p: Project, field: keyof Project, value: string) {
    await apiPatch(p.id, { [field]: field === 'display_order' ? Number(value) : value } as Partial<Project>);
  }

  async function remove(id: string) {
    if (!confirm('Delete this project permanently?')) return;
    setBusyId(id);
    await apiDelete(id);
    await load();
    setBusyId(null);
  }

  async function createProject() {
    if (!draft.slug || !draft.title || !draft.location || !draft.summary || !draft.description) {
      alert('Slug, title, location, summary and description are required.');
      return;
    }
    setCreating(true);
    const { error } = await apiCreate({
      ...draft,
      year: draft.year ? Number(draft.year) : null,
      display_order: Number(draft.display_order) || 0,
      client_or_collab: draft.client_or_collab || null,
    });
    setCreating(false);
    if (error) { alert(error); return; }
    setDraft(EMPTY_DRAFT);
    await load();
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Portfolio Projects</h1>
          <p className={styles.sub}>Manage case studies shown on /projects. Inactive projects are hidden from the public grid.</p>
        </div>
      </div>

      {/* Add new project */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 20, marginBottom: 32, display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', background: 'var(--paper-2)' }}>
        <input style={inputStyle} placeholder="slug (e.g. yuen-long-stadium)" value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))} />
        <input style={inputStyle} placeholder="Title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
        <select style={inputStyle} value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input style={inputStyle} placeholder="Location" value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} />
        <input style={inputStyle} placeholder="Client / collaborator (optional)" value={draft.client_or_collab} onChange={e => setDraft(d => ({ ...d, client_or_collab: e.target.value }))} />
        <input style={inputStyle} placeholder="Year" value={draft.year} onChange={e => setDraft(d => ({ ...d, year: e.target.value }))} />
        <input style={{ ...inputStyle, gridColumn: '1 / -1' }} placeholder="Summary (one line, shown on grid card)" value={draft.summary} onChange={e => setDraft(d => ({ ...d, summary: e.target.value }))} />
        <textarea style={{ ...inputStyle, gridColumn: '1 / -1', minHeight: 70 }} placeholder="Full description" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
        <input style={inputStyle} placeholder="Display order" value={draft.display_order} onChange={e => setDraft(d => ({ ...d, display_order: e.target.value }))} />
        <button className={styles.approveBtn} disabled={creating} onClick={createProject} style={{ justifySelf: 'start' }}>
          {creating ? 'Adding…' : 'Add project'}
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'var(--brass)' }}>{error}</p>}
      {!loading && items.length === 0 && <div className={styles.empty}>No projects yet.</div>}

      <div className={styles.list}>
        {items.map(p => (
          <div key={p.id} className={styles.card} style={{ opacity: p.active ? 1 : 0.55 }}>
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{p.title}</span>
              <span className={styles.cardMeta}>{p.category} · {p.location}{p.client_or_collab ? ` · ${p.client_or_collab}` : ''}{p.year ? ` · ${p.year}` : ''}</span>
            </div>
            <textarea
              defaultValue={p.summary}
              style={{ ...inputStyle, marginTop: 8, minHeight: 40 }}
              onBlur={e => saveField(p, 'summary', e.target.value)}
            />
            <textarea
              defaultValue={p.description}
              style={{ ...inputStyle, marginTop: 8, minHeight: 90 }}
              onBlur={e => saveField(p, 'description', e.target.value)}
            />
            <div className={styles.actions}>
              <button className={styles.approveBtn} disabled={busyId === p.id} onClick={() => toggleActive(p)}>
                {p.active ? 'Deactivate' : 'Activate'}
              </button>
              <button className={styles.rejectBtn} disabled={busyId === p.id} onClick={() => toggleFeatured(p)}>
                {p.featured ? 'Unfeature' : 'Feature'}
              </button>
              <button className={styles.deleteBtn} disabled={busyId === p.id} onClick={() => remove(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
