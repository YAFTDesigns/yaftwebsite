'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from '../admin.module.css';
import ClassesPanel from './ClassesPanel';
import LiveBillsPanel from './LiveBillsPanel';
import StudentsPanel from './StudentsPanel';
import { CoursesBatchesPanel, ProjectReviewsPanel, CertificatesPanel, TestimonialsPanel, AuditPanel } from './OtherPanels';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const tabBtn = (on: boolean) => ({ background: 'transparent', color: on ? 'var(--ink)' : 'var(--ink-soft)', border: 'none', borderBottom: `2px solid ${on ? 'var(--blueprint)' : 'transparent'}`, padding: '10px 16px', fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: -1 }) as const;
const TABS = ['Live bills', 'Students & Enrolments', 'Courses & Batches', 'Classes', 'Project Reviews', 'Certificates', 'Testimonials', 'Audit log'] as const;

export default function TrainingClient() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Live bills');
  const [bills, setBills] = useState<Json[] | null>(null);
  const [d, setD] = useState<Json>({});
  const [projects, setProjects] = useState<Json[]>([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch('/api/admin/training'), fetch('/api/admin/student-projects')]);
    if (a.ok) setD(await a.json());
    if (b.ok) setProjects((await b.json()).data ?? []);
  }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); }, [load]);
  // Live bills refresh by themselves every 30 seconds while that tab is open.
  useEffect(() => {
    if (tab !== 'Live bills') return;
    let live = true;
    const pull = () => fetch('/api/admin/training/live-bills', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j) setBills(j.bills ?? []); }).catch(() => {});
    pull();
    const t = setInterval(pull, 30000);
    return () => { live = false; clearInterval(t); };
  }, [tab]);


  async function act(url: string, body: Json) {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (j.result?.status === 'needs_setup' || j.result?.status === 'not_eligible' ? `Not issued: ${(j.result.missing ?? []).join(', ')}` : 'Done.') : j.error ?? 'Failed');
    load();
  }
  const post = (body: Json) => act('/api/admin/training', body);

  return (
    <>
      <h1 className={styles.sectionTitle}>Training: students, projects, certificates</h1>
      <div style={{ marginBottom: 18, borderBottom: '1px solid var(--line)' }}>{TABS.map((t) => <button key={t} style={tabBtn(tab === t)} onClick={() => setTab(t)}>{t}</button>)}</div>
      {msg && <p style={{ color: 'var(--brass)' }}>{msg}</p>}

      {tab === 'Live bills' && <LiveBillsPanel bills={bills} courses={d.courses ?? []} rules={d.rules ?? []} />}

      {tab === 'Students & Enrolments' && <StudentsPanel d={d} post={post} />}

      {tab === 'Courses & Batches' && <CoursesBatchesPanel d={d} post={post} />}

      {tab === 'Classes' && <ClassesPanel courses={d.courses ?? []} />}

      {tab === 'Project Reviews' && <ProjectReviewsPanel projects={projects} act={act} />}

      {tab === 'Certificates' && <CertificatesPanel d={d} post={post} />}

      {tab === 'Testimonials' && <TestimonialsPanel d={d} post={post} />}

      {tab === 'Audit log' && <AuditPanel d={d} />}
    </>
  );
}
