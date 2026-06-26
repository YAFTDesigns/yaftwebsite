import { getSupabaseAdmin } from '@/lib/supabase/admin';
import BarChart from '@/components/admin/BarChart';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

const SOURCES = ['syllabus_gate', 'contact_form'] as const;

async function getCounts() {
  const supabase = getSupabaseAdmin();
  const [leads, enquiries, syllabusRequests, unlocks, leadsBySource, pendingTestimonials] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('enquiries').select('id', { count: 'exact', head: true }),
    supabase.from('syllabus_requests').select('id', { count: 'exact', head: true }),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'syllabus_unlock'),
    Promise.all(
      SOURCES.map((source) =>
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('source', source)
      )
    ),
    supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return {
    leads: leads.count ?? 0,
    enquiries: enquiries.count ?? 0,
    syllabusRequests: syllabusRequests.count ?? 0,
    unlocks: unlocks.count ?? 0,
    leadsBySource: SOURCES.map((source, i) => ({ label: source, value: leadsBySource[i].count ?? 0 })),
    pendingTestimonials: pendingTestimonials.count ?? 0,
  };
}

export default async function AdminOverviewPage() {
  const counts = await getCounts();

  return (
    <>
      <h1 className={styles.sectionTitle}>Overview</h1>
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.leads}</div>
          <div className={styles.statLabel}>Total leads</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.enquiries}</div>
          <div className={styles.statLabel}>Enquiries</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.syllabusRequests}</div>
          <div className={styles.statLabel}>Syllabus requests</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.unlocks}</div>
          <div className={styles.statLabel}>Syllabus unlocks (events)</div>
        </div>
        <a href="/admin/testimonials" className={styles.stat} style={{ textDecoration: 'none', cursor: 'pointer', border: counts.pendingTestimonials > 0 ? '1px solid var(--brass)' : undefined }}>
          <div className={styles.statValue} style={{ color: counts.pendingTestimonials > 0 ? 'var(--brass)' : undefined }}>
            {counts.pendingTestimonials}
          </div>
          <div className={styles.statLabel}>
            Testimonials pending review {counts.pendingTestimonials > 0 ? '→' : ''}
          </div>
        </a>
      </div>
      <div className="eyebrow" style={{ marginBottom: 16 }}>LEAD SOURCE</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Leads by how they came in</h2>
        <BarChart items={counts.leadsBySource} />
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
        See <strong>Leads</strong> for everyone who&apos;s unlocked a syllabus or submitted the contact form,{' '}
        <strong>Enquiries</strong> for contact form submissions, and <strong>Analytics</strong> for the page-view → unlock
        → enquiry funnel.
      </p>
    </>
  );
}
