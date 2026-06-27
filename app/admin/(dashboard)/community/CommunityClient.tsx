'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../../../admin/testimonials/testimonials.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StudentWork = {
  id: string;
  created_at: string;
  name: string;
  role: string;
  project_title: string;
  tool: string;
  category: string;
  description: string;
  portfolio_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
};

type Publication = {
  id: string;
  created_at: string;
  author_name: string;
  author_role: string;
  title: string;
  magazine: string;
  pub_month: string | null;
  pub_year: number;
  description: string;
  article_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
};

type Partner = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  type: string;
  display_order: number;
  active: boolean;
};

type Section = 'student_work' | 'publications' | 'partners';
type StatusFilter = 'pending' | 'approved' | 'rejected';

export default function AdminCommunityPage() {
  const [section, setSection] = useState<Section>('student_work');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [studentWork, setStudentWork] = useState<StudentWork[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [counts, setCounts] = useState({ sw_pending: 0, pub_pending: 0 });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadCounts() {
    const [sw, pub] = await Promise.all([
      supabase.from('student_work').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('publications').select('id', { count: 'exact' }).eq('status', 'pending'),
    ]);
    setCounts({ sw_pending: sw.count ?? 0, pub_pending: pub.count ?? 0 });
  }

  async function loadStudentWork() {
    setLoading(true);
    const { data } = await supabase
      .from('student_work')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setStudentWork(data || []);
    setLoading(false);
  }

  async function loadPublications() {
    setLoading(true);
    const { data } = await supabase
      .from('publications')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setPublications(data || []);
    setLoading(false);
  }

  async function loadPartners() {
    setLoading(true);
    const { data } = await supabase
      .from('partners')
      .select('*')
      .order('display_order');
    setPartners(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCounts();
    if (section === 'student_work') loadStudentWork();
    else if (section === 'publications') loadPublications();
    else loadPartners();
  }, [section, filter]);

  async function updateSW(id: string, status: 'approved' | 'rejected') {
    setActionId(id);
    await supabase.from('student_work').update({ status }).eq('id', id);
    await loadStudentWork();
    await loadCounts();
    setActionId(null);
  }

  async function deleteSW(id: string) {
    if (!confirm('Delete this submission permanently?')) return;
    setActionId(id);
    await supabase.from('student_work').delete().eq('id', id);
    await loadStudentWork();
    await loadCounts();
    setActionId(null);
  }

  async function updatePub(id: string, status: 'approved' | 'rejected') {
    setActionId(id);
    await supabase.from('publications').update({ status }).eq('id', id);
    await loadPublications();
    await loadCounts();
    setActionId(null);
  }

  async function deletePub(id: string) {
    if (!confirm('Delete this publication permanently?')) return;
    setActionId(id);
    await supabase.from('publications').delete().eq('id', id);
    await loadPublications();
    await loadCounts();
    setActionId(null);
  }

  async function togglePartner(id: string, active: boolean) {
    setActionId(id);
    await supabase.from('partners').update({ active: !active }).eq('id', id);
    await loadPartners();
    setActionId(null);
  }

  async function deletePartner(id: string) {
    if (!confirm('Delete this partner permanently?')) return;
    setActionId(id);
    await supabase.from('partners').delete().eq('id', id);
    await loadPartners();
    setActionId(null);
  }

  const TOOL_MAP: Record<string, string> = { rhino: 'Rhino3D', grasshopper: 'Grasshopper', rir: 'RIR' };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Community</h1>
          <p className={styles.sub}>Manage student work submissions, publications, and partners.</p>
        </div>
      </div>

      {/* section tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${section === 'student_work' ? styles.activeTab : ''}`} onClick={() => setSection('student_work')}>
          Student Work
        </button>
        <button className={`${styles.tab} ${section === 'publications' ? styles.activeTab : ''}`} onClick={() => setSection('publications')}>
          Publications
        </button>
        <button className={`${styles.tab} ${section === 'partners' ? styles.activeTab : ''}`} onClick={() => setSection('partners')}>
          Partners
        </button>
      </div>

      {/* status filter — only for student work + publications */}
      {section !== 'partners' && (
        <div className={styles.tabs} style={{ marginBottom: 24 }}>
          {(['pending', 'approved', 'rejected'] as StatusFilter[]).map(s => (
            <button key={s} className={`${styles.tab} ${filter === s ? styles.activeTab : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {loading && <p className={styles.empty}>Loading…</p>}

      {/* STUDENT WORK */}
      {!loading && section === 'student_work' && (
        studentWork.length === 0
          ? <p className={styles.empty}>No {filter} submissions.</p>
          : <div className={styles.list}>
              {studentWork.map(s => (
                <div key={s.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardName}>{s.project_title}</p>
                      <p className={styles.cardRole}>{s.name} · {s.role}</p>
                      <p className={styles.cardCourse}>{TOOL_MAP[s.tool] ?? s.tool} · {s.category}</p>
                    </div>
                    <div className={styles.cardMeta}>
                      <p className={styles.cardDate}>{new Date(s.created_at).toLocaleDateString()}</p>
                      {s.portfolio_url && <a className={styles.socialLink} href={s.portfolio_url} target="_blank" rel="noopener">Portfolio →</a>}
                    </div>
                  </div>
                  <p className={styles.quote}>{s.description}</p>
                  <div className={styles.actions}>
                    <button className={styles.deleteBtn} disabled={actionId === s.id} onClick={() => deleteSW(s.id)}>Delete</button>
                    {filter !== 'approved'  && <button className={styles.approveBtn} disabled={actionId === s.id} onClick={() => updateSW(s.id, 'approved')}>Approve</button>}
                    {filter !== 'rejected'  && <button className={styles.rejectBtn}  disabled={actionId === s.id} onClick={() => updateSW(s.id, 'rejected')}>Reject</button>}
                    {filter === 'rejected'  && <button className={styles.approveBtn} disabled={actionId === s.id} onClick={() => updateSW(s.id, 'approved')}>Approve</button>}
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* PUBLICATIONS */}
      {!loading && section === 'publications' && (
        publications.length === 0
          ? <p className={styles.empty}>No {filter} publications.</p>
          : <div className={styles.list}>
              {publications.map(p => (
                <div key={p.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardName}>{p.title}</p>
                      <p className={styles.cardRole}>{p.author_name} · {p.author_role}</p>
                      <p className={styles.cardCourse}>{p.magazine} · {p.pub_month} {p.pub_year}</p>
                    </div>
                    <div className={styles.cardMeta}>
                      <p className={styles.cardDate}>{new Date(p.created_at).toLocaleDateString()}</p>
                      {p.article_url && <a className={styles.socialLink} href={p.article_url} target="_blank" rel="noopener">Read article →</a>}
                    </div>
                  </div>
                  <p className={styles.quote}>{p.description}</p>
                  <div className={styles.actions}>
                    <button className={styles.deleteBtn} disabled={actionId === p.id} onClick={() => deletePub(p.id)}>Delete</button>
                    {filter !== 'approved' && <button className={styles.approveBtn} disabled={actionId === p.id} onClick={() => updatePub(p.id, 'approved')}>Approve</button>}
                    {filter !== 'rejected' && <button className={styles.rejectBtn}  disabled={actionId === p.id} onClick={() => updatePub(p.id, 'rejected')}>Reject</button>}
                    {filter === 'rejected' && <button className={styles.approveBtn} disabled={actionId === p.id} onClick={() => updatePub(p.id, 'approved')}>Approve</button>}
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* PARTNERS */}
      {!loading && section === 'partners' && (
        partners.length === 0
          ? <p className={styles.empty}>No partners found.</p>
          : <div className={styles.list}>
              {partners.map(p => (
                <div key={p.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardName}>{p.name}</p>
                      <p className={styles.cardRole}>{p.description}</p>
                      <p className={styles.cardCourse}>{p.type} · order {p.display_order}</p>
                    </div>
                    <div className={styles.cardMeta}>
                      <p className={styles.cardDate} style={{ color: p.active ? '#4caf50' : '#888' }}>
                        {p.active ? 'Active' : 'Hidden'}
                      </p>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.deleteBtn} disabled={actionId === p.id} onClick={() => deletePartner(p.id)}>Delete</button>
                    <button className={p.active ? styles.rejectBtn : styles.approveBtn} disabled={actionId === p.id} onClick={() => togglePartner(p.id, p.active)}>
                      {p.active ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
