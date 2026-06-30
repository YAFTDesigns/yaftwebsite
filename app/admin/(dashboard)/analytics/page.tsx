import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import BarChart from '@/components/admin/BarChart';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

const FUNNEL_STEPS = ['page_view', 'syllabus_modal_open', 'syllabus_unlock', 'enquiry_submit'] as const;
const FUNNEL_LABELS: Record<(typeof FUNNEL_STEPS)[number], string> = {
  page_view: 'Page view',
  syllabus_modal_open: 'Syllabus modal open',
  syllabus_unlock: 'Syllabus unlock',
  enquiry_submit: 'Enquiry submit',
};

function countBy<T extends string>(rows: { value: T }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.value] = (counts[row.value] ?? 0) + 1;
  return counts;
}

async function getAnalytics() {
  const supabase = getSupabaseAdmin();

  const [eventsRes, courseRes] = await Promise.all([
    safeQuery<{ event_type: string }[]>(
      supabase.from('analytics_events').select('event_type').limit(20000),
      [],
      'analytics events'
    ),
    safeQuery<{ course_slug: string }[]>(
      supabase.from('syllabus_requests').select('course_slug').limit(20000),
      [],
      'syllabus requests'
    ),
  ]);

  const byEventType = countBy((eventsRes.data ?? []).map((r) => ({ value: r.event_type as string })));
  const byCourse = countBy((courseRes.data ?? []).map((r) => ({ value: r.course_slug as string })));

  const errors = [eventsRes.error, courseRes.error].filter(Boolean) as string[];

  return { byEventType, byCourse, error: errors.length > 0 ? errors.join('; ') : null };
}

export default async function AdminAnalyticsPage() {
  const { byEventType, byCourse, error } = await getAnalytics();

  const funnelItems = FUNNEL_STEPS.map((step) => ({ label: FUNNEL_LABELS[step], value: byEventType[step] ?? 0 }));
  const topCourses = Object.entries(byCourse)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ label: slug, value: count }));

  return (
    <>
      <h1 className={styles.sectionTitle}>Analytics</h1>

      {error && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Some analytics data could not be loaded: {error}
          </p>
        </div>
      )}

      <div className={`eyebrow ${styles.eyebrowSpaced}`}>FUNNEL</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Page view → modal → unlock → enquiry</h2>
        <BarChart items={funnelItems} />
      </div>

      <div className={`eyebrow ${styles.eyebrowSpaced}`}>SYLLABUS REQUESTS</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>By course</h2>
        {topCourses.length === 0 ? (
          <p className={styles.empty}>No syllabus requests yet.</p>
        ) : (
          <BarChart items={topCourses} color="var(--brass)" />
        )}
      </div>
    </>
  );
}
