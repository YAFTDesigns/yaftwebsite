'use client';

import { useState } from 'react';
import styles from '@/components/admin/adminPage.module.css';

type Member = {
  id: string; name: string; role: string | null; email: string | null;
  phone: string | null; salary: number | null; notes: string | null; active: boolean;
};

const EMPTY_FORM = { name: '', role: '', email: '', phone: '', salary: '', notes: '' };

function fmtSalary(n: number) { return n.toLocaleString('en-IN', { minimumFractionDigits: 0 }); }

export default function TeamClient({ initialTeam }: { initialTeam?: Member[] }) {
  const [team, setTeam] = useState<Member[]>(initialTeam ?? []);
  const [showInactive, setShowInactive] = useState(false);
  const [showSalary, setShowSalary] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    const res = await fetch('/api/team?all=1');
    const json = await res.json();
    setTeam(json.team ?? []);
  }

  function setF(k: keyof typeof EMPTY_FORM, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(m: Member) {
    setEditId(m.id);
    setForm({
      name: m.name, role: m.role ?? '', email: m.email ?? '', phone: m.phone ?? '',
      salary: m.salary != null ? String(m.salary) : '', notes: m.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function submit() {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const res = editId
        ? await fetch(`/api/team/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Save failed');
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: Member) {
    await fetch(`/api/team/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !m.active }) });
    await load();
  }

  async function remove(m: Member) {
    if (!confirm(`Remove "${m.name}" from the team directory?`)) return;
    await fetch(`/api/team/${m.id}`, { method: 'DELETE' });
    await load();
  }

  const visible = team.filter(m => showInactive || m.active);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Team</h1>
          <p className={styles.sub}>Accountant, designers, and anyone else you need saved contact details for.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={openNew} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add person
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
          <input type="checkbox" checked={showSalary} onChange={e => setShowSalary(e.target.checked)} />
          Show salary
        </label>
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>No one added yet.</p>
      ) : (
        <div className={styles.list}>
          {visible.map(m => (
            <div className={styles.card} key={m.id} style={{ opacity: m.active ? 1 : 0.55 }}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardName}>{m.name}{!m.active && <span style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--mono)', color: '#888' }}>INACTIVE</span>}</p>
                  {m.role && <p className={styles.cardRole}>{m.role}</p>}
                  <p className={styles.cardCourse}>{[m.email, m.phone].filter(Boolean).join(' · ') || 'No contact details on file'}</p>
                  {showSalary && m.salary != null && (
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#666', marginTop: 4 }}>Salary: INR {fmtSalary(m.salary)}</p>
                  )}
                </div>
                <div className={styles.actions} style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(m)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => toggleActive(m)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                    {m.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button onClick={() => remove(m)} className={styles.deleteBtn}>Delete</button>
                </div>
              </div>
              {m.notes && <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>{m.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)' }}>
          <div style={{ width: '100%', maxWidth: 460, margin: '0 16px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 16 }}>{editId ? 'Edit person' : 'Add person'}</h3>

            {[
              ['name', 'Name *'], ['role', 'Role (e.g. Accountant, Designer)'],
              ['email', 'Email'], ['phone', 'Phone'], ['salary', 'Salary (INR, optional)'], ['notes', 'Notes'],
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#777', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                <input
                  type={key === 'salary' ? 'number' : 'text'}
                  value={(form as any)[key]}
                  onChange={e => setF(key as keyof typeof EMPTY_FORM, e.target.value)}
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#ddd', fontSize: 13 }}
                />
              </div>
            ))}

            {formError && <p style={{ fontSize: 12, color: '#E63946', marginBottom: 12 }}>{formError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{ background: 'var(--brass)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editId ? 'Save changes' : 'Add person'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
