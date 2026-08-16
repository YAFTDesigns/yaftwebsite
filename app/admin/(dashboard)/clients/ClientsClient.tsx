'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/components/admin/adminPage.module.css';
import { getErrorMessage } from '@/lib/errorMessage';

type Client = {
  id: string; created_at: string; updated_at: string;
  name: string; company_name: string | null; gstin: string | null;
  address: string | null; phone: string | null; email: string | null;
  notes: string | null; active: boolean; deleted_at: string | null;
  share_token: string | null;
};

const EMPTY_FORM = { name: '', company_name: '', gstin: '', address: '', phone: '', email: '', notes: '' };
const FIELD_LABELS: Record<keyof typeof EMPTY_FORM, string> = {
  name: 'Name *', company_name: 'Company', gstin: 'GSTIN',
  phone: 'Phone', email: 'Email', address: 'Address', notes: 'Notes',
};

export default function ClientsClient({ initialClients }: { initialClients?: Client[] }) {
  const hasInitialData = initialClients !== undefined;
  const [clients, setClients] = useState<Client[]>(initialClients ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadError, setLoadError] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`/api/clients?all=1`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load');
      setClients(json.clients ?? []);
    } catch {
      setLoadError('Could not load clients.');
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
  }, [hasInitialData]);

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({
      name: c.name, company_name: c.company_name ?? '', gstin: c.gstin ?? '',
      address: c.address ?? '', phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function submit() {
    if (!form.name.trim()) { setFormError('Client name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const res = editId
        ? await fetch(`/api/clients/${editId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
          })
        : await fetch('/api/clients', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Client) {
    await fetch(`/api/clients/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !c.active }),
    });
    await load();
  }

  async function remove(c: Client) {
    if (!confirm(`Delete client "${c.name}"? This won't affect existing jobs already logged under this client.`)) return;
    await fetch(`/api/clients/${c.id}`, { method: 'DELETE' });
    await load();
  }

  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);

  async function getShareLink(c: Client) {
    setLinkBusyId(c.id);
    try {
      const res = await fetch(`/api/clients/${c.id}/share-link`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to generate link');
      const fullUrl = `${window.location.origin}${json.url}`;
      await navigator.clipboard.writeText(fullUrl).catch(() => {});
      alert(`Share link copied to clipboard:\n\n${fullUrl}\n\nAnyone with this link can view/download ${c.name}'s job list, no login needed. Send it directly to the client.`);
      await load();
    } catch (err) {
      alert(getErrorMessage(err) || 'Failed to generate link');
    } finally {
      setLinkBusyId(null);
    }
  }

  async function revokeShareLink(c: Client) {
    if (!confirm(`Revoke the share link for "${c.name}"? The old link will stop working immediately. You can generate a new one anytime.`)) return;
    setLinkBusyId(c.id);
    try {
      await fetch(`/api/clients/${c.id}/share-link`, { method: 'DELETE' });
      await load();
    } finally {
      setLinkBusyId(null);
    }
  }

  const visible = clients.filter(c => {
    if (!showInactive && !c.active) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q)
      || (c.company_name ?? '').toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q)
      || (c.gstin ?? '').toLowerCase().includes(q);
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Clients</h1>
          <p className={styles.sub}>Client register for jobs and invoicing.</p>
        </div>
        <button
          onClick={openNew}
          style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Client
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search name, company, email, GSTIN..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '1 1 260px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', color: '#ddd', fontSize: 13 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : loadError ? (
        <p className={styles.empty}>{loadError}</p>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>{searchQuery ? `No clients match "${searchQuery}".` : 'No clients yet.'}</p>
      ) : (
        <div className={styles.list}>
          {visible.map(c => (
            <div className={styles.card} key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardName}>{c.name}{!c.active && <span style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>INACTIVE</span>}</p>
                  {c.company_name && <p className={styles.cardRole}>{c.company_name}</p>}
                  <p className={styles.cardCourse}>
                    {[c.email, c.phone, c.gstin].filter(Boolean).join(' · ') || 'No contact details on file'}
                  </p>
                </div>
                <div className={styles.actions} style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/admin/clients/${c.id}`} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-block' }}>View jobs</Link>
                  <button onClick={() => openEdit(c)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                  {c.share_token ? (
                    <>
                      <button onClick={() => getShareLink(c)} disabled={linkBusyId === c.id} style={{ background: 'transparent', border: '1px solid #25D366', color: '#25D366', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>Copy share link</button>
                      <button onClick={() => revokeShareLink(c)} disabled={linkBusyId === c.id} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>Revoke</button>
                    </>
                  ) : (
                    <button onClick={() => getShareLink(c)} disabled={linkBusyId === c.id} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                      {linkBusyId === c.id ? 'Generating...' : 'Get share link'}
                    </button>
                  )}
                  <button onClick={() => toggleActive(c)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                    {c.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button onClick={() => remove(c)} className={styles.deleteBtn}>Delete</button>
                </div>
              </div>
              {c.notes && <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ width: '100%', maxWidth: 460, margin: '0 16px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>{editId ? 'Edit client' : 'New client'}</h3>

            {(Object.keys(EMPTY_FORM) as (keyof typeof EMPTY_FORM)[]).map((key) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{FIELD_LABELS[key]}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => setF(key, e.target.value)}
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#ddd', fontSize: 13 }}
                />
              </div>
            ))}

            {formError && <p style={{ fontSize: 12, color: '#E63946', marginBottom: 12 }}>{formError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editId ? 'Save changes' : 'Add client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
