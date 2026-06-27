'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './analytics.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Submission = {
  id: string;
  name: string;
  role: string;
  institution: string;
  course_taken: string;
  quote: string;
  status: string;
  submitted_at: string;
};

type CourseStat = { name: string; count: number };

export default function TestimonialAnalyticsPage() {
  const [all, setAll] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('testimonials')
      .select('id, name, role, institution, course_taken, quote, status, submitted_at')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setAll(data || []);
        setLoading(false);
      });
  }, []);

  // Counts
  const total = all.length;
  const approved = all.filter(t => t.status === 'approved').length;
  const pending = all.filter(t => t.status === 'pending').length;
  const rejected = all.filter(t => t.status === 'rejected').length;

  // Course breakdown
  const courseCounts: Record<string, number> = {};
  all.forEach(t => {
    const key = t.course_taken?.trim() || 'Not specified';
    courseCounts[key] = (courseCounts[key] || 0) + 1;
  });
  const courseStats: CourseStat[] = Object.entries(courseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Role breakdown
  const roleCounts: Record<string, number> = {};
  all.forEach(t => {
    const key = t.role?.trim() || 'Not specified';
    roleCounts[key] = (roleCounts[key] || 0) + 1;
  });
  const roleStats = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Submissions over time (by month)
  const monthCounts: Record<string, number> = {};
  all.forEach(t => {
    const month = new Date(t.submitted_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  const monthStats = Object.entries(monthCounts)
    .slice(-6)
    .map(([name, count]) => ({ name, count }));

  const maxCourse = Math.max(...courseStats.map(c => c.count), 1);
  const maxRole = Math.max(...roleStats.map(r => r.count), 1);
  const maxMonth = Math.max(...monthStats.map(m => m.count), 1);

  if (loading) return <div className={styles.loading}>Loading analytics...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Feedback Analytics</h1>
          <p className={styles.sub}>Insights from all {total} submissions</p>
        </div>
        <a href="/admin/testimonials" className={styles.back}>← All testimonials</a>
      </div>

      {/* Summary */}
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.statVal}>{total}</div>
          <div className={styles.statLabel}>Total submissions</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: 'var(--brass)' }}>{approved}</div>
          <div className={styles.statLabel}>Approved on site</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{pending}</div>
          <div className={styles.statLabel}>Awaiting review</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{rejected}</div>
          <div className={styles.statLabel}>Not published</div>
        </div>
      </div>

      {/* Course breakdown */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Which course or workshop got the most feedback</h2>
        <p className={styles.panelNote}>Tells you where students are most engaged and vocal.</p>
        <div className={styles.bars}>
          {courseStats.map(c => (
            <div key={c.name} className={styles.barRow}>
              <div className={styles.barLabel}>{c.name}</div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(c.count / maxCourse) * 100}%` }}
                />
              </div>
              <div className={styles.barCount}>{c.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Role breakdown */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Who is giving feedback</h2>
        <p className={styles.panelNote}>Understand your actual audience — students, professionals, faculty.</p>
        <div className={styles.bars}>
          {roleStats.map(r => (
            <div key={r.name} className={styles.barRow}>
              <div className={styles.barLabel}>{r.name}</div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${(r.count / maxRole) * 100}%`, background: 'var(--blueprint)' }}
                />
              </div>
              <div className={styles.barCount}>{r.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Submissions over time */}
      {monthStats.length > 1 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Submissions over time</h2>
          <p className={styles.panelNote}>Spikes usually follow a workshop or new course batch.</p>
          <div className={styles.bars}>
            {monthStats.map(m => (
              <div key={m.name} className={styles.barRow}>
                <div className={styles.barLabel}>{m.name}</div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${(m.count / maxMonth) * 100}%`, background: 'var(--crimson)' }}
                  />
                </div>
                <div className={styles.barCount}>{m.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All quotes for reading */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>All feedback, unfiltered</h2>
        <p className={styles.panelNote}>Read these to find what to improve, what to keep, and what students value most.</p>
        <div className={styles.quoteList}>
          {all.map(t => (
            <div key={t.id} className={styles.quoteCard}>
              <div className={styles.quoteMeta}>
                <span className={styles.quoteName}>{t.name}</span>
                <span className={styles.quoteRole}>{t.role}{t.institution ? `, ${t.institution}` : ''}</span>
                {t.course_taken && <span className={styles.quoteCourse}>{t.course_taken}</span>}
                <span className={`${styles.quoteBadge} ${styles[t.status]}`}>{t.status}</span>
              </div>
              <p className={styles.quoteText}>{t.quote}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
