'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './testimonials.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Testimonial = {
  id: string;
  name: string;
  role: string;
  institution: string;
  course_taken: string;
  quote: string;
  linkedin_url: string;
  instagram_url: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('status', filter)
      .order('submitted_at', { ascending: false });
    if (error) {
      console.error('Failed to load testimonials:', error);
      setLoadError(error.message);
    }
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => { load(); }, 20000);
    return () => clearInterval(interval);
  }, [filter]);

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActionId(id);
    await supabase
      .from('testimonials')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setActionId(null);
    load();
  }

  async function deleteTestimonial(id: string) {
    if (!confirm('Delete this testimonial permanently? This cannot be undone.')) return;
    setActionId(id);
    await supabase.from('testimonials').delete().eq('id', id);
    setActionId(null);
    load();
  }

  const pending = items.filter(i => i.status === 'pending').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Testimonials</h1>
          <p className={styles.sub}>Review and approve student submissions</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/admin/testimonials/analytics" className={styles.back}>View analytics →</a>
          <a href="/admin" className={styles.back}>← Back to admin</a>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            className={`${styles.tab} ${filter === s ? styles.activeTab : ''}`}
            onClick={() => setFilter(s)}
          >
            {STATUS_LABELS[s]}
            {s === 'pending' && pending > 0 && (
              <span className={styles.badge}>{pending}</span>
            )}
          </button>
        ))}
      </div>

      {loadError && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Could not load testimonials: {loadError}
          </p>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>No {filter} testimonials.</div>
      ) : (
        <div className={styles.list}>
          {items.map(t => (
            <div key={t.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.cardName}>{t.name}</div>
                  <div className={styles.cardRole}>
                    {t.role}{t.institution ? `, ${t.institution}` : ''}
                  </div>
                  {t.course_taken && (
                    <div className={styles.cardCourse}>{t.course_taken}</div>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  <div className={styles.cardDate}>
                    {new Date(t.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {t.linkedin_url && (
                    <a href={t.linkedin_url} target="_blank" rel="noopener" className={styles.socialLink}>LinkedIn ↗</a>
                  )}
                  {t.instagram_url && (
                    <a href={t.instagram_url} target="_blank" rel="noopener" className={styles.socialLink}>Instagram ↗</a>
                  )}
                </div>
              </div>

              <blockquote className={styles.quote}>
                {t.quote}
              </blockquote>

              {filter === 'pending' && (
                <div className={styles.actions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteTestimonial(t.id)}
                    disabled={actionId === t.id}
                  >
                    Delete
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => updateStatus(t.id, 'rejected')}
                    disabled={actionId === t.id}
                  >
                    Reject
                  </button>
                  <button
                    className={styles.approveBtn}
                    onClick={() => updateStatus(t.id, 'approved')}
                    disabled={actionId === t.id}
                  >
                    {actionId === t.id ? 'Saving...' : 'Approve'}
                  </button>
                </div>
              )}

              {filter === 'approved' && (
                <div className={styles.actions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteTestimonial(t.id)}
                    disabled={actionId === t.id}
                  >
                    Delete
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => updateStatus(t.id, 'rejected')}
                    disabled={actionId === t.id}
                  >
                    Remove from site
                  </button>
                </div>
              )}

              {filter === 'rejected' && (
                <div className={styles.actions}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteTestimonial(t.id)}
                    disabled={actionId === t.id}
                  >
                    Delete
                  </button>
                  <button
                    className={styles.approveBtn}
                    onClick={() => updateStatus(t.id, 'approved')}
                    disabled={actionId === t.id}
                  >
                    Approve after all
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
