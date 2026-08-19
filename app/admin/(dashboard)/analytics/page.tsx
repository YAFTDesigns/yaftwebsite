import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import BarChart from '@/components/admin/BarChart';
import LineChart from '@/components/admin/LineChart';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function sixMonthsAgoStart() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 5);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const FUNNEL_STEPS = ['page_view', 'course_gate_open', 'course_gate_unlock', 'enquiry_submit'] as const;
const FUNNEL_LABELS: Record<(typeof FUNNEL_STEPS)[number], string> = {
  page_view: 'Page view',
  course_gate_open: 'Syllabus modal open',
  course_gate_unlock: 'Syllabus unlock',
  enquiry_submit: 'Enquiry submit',
};

const WA_FUNNEL_STEPS = ['whatsapp_gate_open', 'whatsapp_click'] as const;
const WA_FUNNEL_LABELS: Record<(typeof WA_FUNNEL_STEPS)[number], string> = {
  whatsapp_gate_open: 'WhatsApp gate shown',
  whatsapp_click: 'WhatsApp opened',
};

async function getAnalytics() {
  const supabase = getSupabaseAdmin();

  const TREND_EVENTS = ['page_view', 'course_gate_open', 'course_gate_unlock', 'enquiry_submit'] as const;

  const [funnelRes, courseRes, sourceRes, trendRes] = await Promise.all([
    safeQuery<{ event_type: string; sessions: number }[]>(
      supabase.from('analytics_funnel_counts').select('event_type, sessions'),
      [],
      'analytics funnel counts'
    ),
    safeQuery<{ course_slug: string; requests: number }[]>(
      supabase.from('syllabus_requests_by_course').select('course_slug, requests'),
      [],
      'syllabus requests by course'
    ),
    safeQuery<{ source: string; sessions: number }[]>(
      supabase.from('analytics_traffic_sources').select('source, sessions'),
      [],
      'analytics traffic sources'
    ),
    // Raw rows rather than a view, same approach the Overview page
    // already uses for its 6-month invoice trend -- current volume
    // (a few thousand rows over 6 months) is trivial to aggregate in
    // JS, not worth a new SQL view for.
    safeQuery<{ event_type: string; created_at: string }[]>(
      supabase.from('analytics_events').select('event_type, created_at')
        .in('event_type', TREND_EVENTS)
        .eq('is_internal', false)
        .gte('created_at', sixMonthsAgoStart()),
      [],
      'analytics 6-month trend'
    ),
  ]);

  const byEventType: Record<string, number> = {};
  for (const row of funnelRes.data) byEventType[row.event_type] = row.sessions;

  const byCourse: Record<string, number> = {};
  for (const row of courseRes.data) byCourse[row.course_slug] = row.requests;

  const bySource: Record<string, number> = {};
  for (const row of sourceRes.data) bySource[row.source] = row.sessions;

  // Build a 6-month trend per event type -- same month-bucketing
  // pattern as the Overview page's revenue trend.
  const now = new Date();
  const monthlyByEvent: Record<string, { label: string; value: number }[]> = {};
  for (const eventType of TREND_EVENTS) monthlyByEvent[eventType] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = MONTH_LABELS[d.getMonth()];
    for (const eventType of TREND_EVENTS) {
      const count = trendRes.data.filter((r) => {
        if (r.event_type !== eventType) return false;
        const rd = new Date(r.created_at);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      }).length;
      monthlyByEvent[eventType].push({ label, value: count });
    }
  }

  const errors = [funnelRes.error, courseRes.error, sourceRes.error, trendRes.error].filter(Boolean) as string[];

  return { byEventType, byCourse, bySource, monthlyByEvent, error: errors.length > 0 ? errors.join('; ') : null };
}

export default async function AdminAnalyticsPage() {
  const { byEventType, byCourse, bySource, monthlyByEvent, error } = await getAnalytics();

  const funnelItems = FUNNEL_STEPS.map((step) => ({ label: FUNNEL_LABELS[step], value: byEventType[step] ?? 0 }));
  const waFunnelItems = WA_FUNNEL_STEPS.map((step) => ({ label: WA_FUNNEL_LABELS[step], value: byEventType[step] ?? 0 }));
  const topCourses = Object.entries(byCourse)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ label: slug, value: count }));
  const sourceItems = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ label: source, value: count }));

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

      <div className={`eyebrow ${styles.eyebrowSpaced}`}>MONTHLY TREND</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Page views</h2>
          <LineChart points={monthlyByEvent.page_view ?? []} color="var(--blueprint)" />
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Syllabus modal opens</h2>
          <LineChart points={monthlyByEvent.course_gate_open ?? []} color="var(--brass)" />
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Syllabus unlocks</h2>
          <LineChart points={monthlyByEvent.course_gate_unlock ?? []} color="#3fb950" />
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Enquiries</h2>
          <LineChart points={monthlyByEvent.enquiry_submit ?? []} color="#E63946" />
        </div>
      </div>

      <div className={`eyebrow ${styles.eyebrowSpaced}`}>FUNNEL</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Page view → modal → unlock → enquiry</h2>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 14 }}>
          Unique sessions reaching each step, not raw event counts.
        </p>
        <BarChart items={funnelItems} />
      </div>

      <div className={`eyebrow ${styles.eyebrowSpaced}`}>WHATSAPP</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Gate shown → WhatsApp opened</h2>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 14 }}>
          Unique sessions reaching each step, same as the funnel above. Recently added -- history is limited until more data comes in.
        </p>
        {waFunnelItems.every(i => i.value === 0) ? (
          <p className={styles.empty}>No WhatsApp gate activity yet.</p>
        ) : (
          <BarChart items={waFunnelItems} color="#25D366" />
        )}
      </div>

      <div className={`eyebrow ${styles.eyebrowSpaced}`}>TRAFFIC SOURCES</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Where sessions come from</h2>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 14 }}>
          First-touch attribution per session. Started tracking today, so history is limited until more data comes in.
        </p>
        {sourceItems.length === 0 ? (
          <p className={styles.empty}>No traffic source data yet.</p>
        ) : (
          <BarChart items={sourceItems} color="var(--blueprint)" />
        )}
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
