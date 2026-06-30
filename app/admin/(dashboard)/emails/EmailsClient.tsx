'use client';

import { useEffect, useState } from 'react';
import styles from '../../../admin/testimonials/testimonials.module.css';
import PieChart from '@/components/admin/PieChart';

const API = '/api/admin/emails';

async function apiGetLogs() {
  const res = await fetch(`${API}?type=logs`);
  const json = await res.json();
  if (!res.ok) return { data: [], error: json.error ?? 'Request failed' };
  return { data: json.data ?? [], error: null };
}

async function apiGetTemplates() {
  const res = await fetch(`${API}?type=templates`);
  const json = await res.json();
  if (!res.ok) return { data: [], error: json.error ?? 'Request failed' };
  return { data: json.data ?? [], error: null };
}

async function apiSaveTemplate(id: string, subject: string, body_html: string) {
  const res = await fetch(API, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, subject, body_html }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? 'Request failed' };
  return { error: null };
}

type Log = {
  id: string;
  created_at: string;
  to_email: string;
  to_name: string;
  subject: string;
  status: string;
  error: string | null;
  template: string;
};

type Template = {
  id: string;
  key: string;
  subject: string;
  body_html: string;
  updated_at: string;
};

function LogCard({ l }: { l: Log }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardName}>{l.to_name}</p>
          <p className={styles.cardRole}>{l.to_email}</p>
          <p className={styles.cardCourse}>{l.subject}</p>
        </div>
        <div className={styles.cardMeta}>
          <p className={styles.cardDate}>{new Date(l.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: l.status === 'sent' ? '#4caf50' : '#e55', marginTop: 4 }}>
            {l.status === 'sent' ? '✓ Sent' : '✗ Failed'}
          </p>
          {l.error && <p style={{ fontSize: 10, color: '#e55', marginTop: 4, maxWidth: 200 }}>{l.error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminEmailsClient() {
  const [tab, setTab]           = useState<'logs' | 'templates'>('logs');
  const [logs, setLogs]         = useState<Log[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing]   = useState<Template | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState('');

  async function loadLogs() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await apiGetLogs();
    if (error) {
      console.error('Failed to load email logs:', error);
      setLoadError(error);
    }
    setLogs(data);
    setLoading(false);
  }

  async function loadTemplates() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await apiGetTemplates();
    if (error) {
      console.error('Failed to load email templates:', error);
      setLoadError(error);
    }
    setTemplates(data);
    if (data.length > 0 && !editing) setEditing(data[0]);
    setLoading(false);
  }

  useEffect(() => {
    if (tab === 'logs') loadLogs();
    else loadTemplates();
  }, [tab]);

  async function saveTemplate() {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    const { error } = await apiSaveTemplate(editing.id, editing.subject, editing.body_html);
    if (error) {
      console.error('Failed to save template:', error);
      setSaveError(error);
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Emails</h1>
          <p className={styles.sub}>Track sent emails and edit templates.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'logs' ? styles.activeTab : ''}`} onClick={() => setTab('logs')}>
          Email Log
        </button>
        <button className={`${styles.tab} ${tab === 'templates' ? styles.activeTab : ''}`} onClick={() => setTab('templates')}>
          Templates
        </button>
      </div>

      {loadError && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Could not load data: {loadError}
          </p>
        </div>
      )}

      {loading && <p className={styles.empty}>Loading…</p>}

      {!loading && tab === 'logs' && logs.length > 0 && (
        <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:10, padding:20, marginBottom:24 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--brass)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>Delivery status</p>
          <PieChart
            size={120}
            slices={[
              { label: 'Sent', value: logs.filter(l => l.status === 'sent').length, color: '#4caf50' },
              { label: 'Failed', value: logs.filter(l => l.status === 'failed').length, color: '#e55' },
            ]}
          />
        </div>
      )}

      {/* EMAIL LOGS */}
      {!loading && tab === 'logs' && (
        logs.length === 0
          ? <p className={styles.empty}>No emails sent yet.</p>
          : (() => {
              const today = new Date().toDateString();
              const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === today);
              const prevLogs  = logs.filter(l => new Date(l.created_at).toDateString() !== today);
              return (
                <div>
                  {todayLogs.length > 0 && (
                    <>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Today — {todayLogs.length} email{todayLogs.length > 1 ? 's' : ''}</p>
                      <div className={styles.list} style={{ marginBottom: 32 }}>
                        {todayLogs.map(l => <LogCard key={l.id} l={l} />)}
                      </div>
                    </>
                  )}
                  {prevLogs.length > 0 && (
                    <>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#555', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Previous</p>
                      <div className={styles.list}>
                        {prevLogs.map(l => <LogCard key={l.id} l={l} />)}
                      </div>
                    </>
                  )}
                </div>
              );
            })()
      )}

      {/* TEMPLATE EDITOR */}
      {!loading && tab === 'templates' && editing && (
        <div>
          {templates.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {templates.map(t => (
                <button key={t.id}
                  onClick={() => setEditing(t)}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 12px',
                    borderRadius: 4, border: '1px solid',
                    borderColor: editing.id === t.id ? 'var(--brass)' : '#2a2a2a',
                    background: editing.id === t.id ? '#1a0808' : 'transparent',
                    color: editing.id === t.id ? 'var(--brass)' : '#888',
                    cursor: 'pointer',
                  }}
                >{t.key}</button>
              ))}
            </div>
          )}

          <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#888', marginBottom: 6 }}>
                Subject — use {'{{name}}'}, {'{{interest}}'} as placeholders
              </p>
              <input
                style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 13, color: '#fff' }}
                value={editing.subject}
                onChange={e => setEditing({ ...editing, subject: e.target.value })}
              />
            </div>

            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#888', marginBottom: 6 }}>
                Body HTML — use {'{{name}}'}, {'{{interest_line}}'}, {'{{message}}'} as placeholders
              </p>
              <textarea
                rows={18}
                style={{ width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', resize: 'vertical' }}
                value={editing.body_html}
                onChange={e => setEditing({ ...editing, body_html: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={saveTemplate}
                disabled={saving}
                style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', background: 'var(--brass)', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save template'}
              </button>
              {saved && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#4caf50' }}>✓ Saved</p>}
              {saveError && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#e55' }}>Could not save: {saveError}</p>}
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#444', marginLeft: 8 }}>
                Last updated: {new Date(editing.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
