import { getSupabaseAdmin } from '@/lib/supabase/admin';
import styles from '@/app/admin/(dashboard)/admin.module.css';

type Win = { label: 'today' | '7d' | '30d'; new: number; returning: number; views: number };
type Summary = {
  windows: Win[];
  sources: { source: string; visitors: number }[];
  pages: { page: string; views: number }[];
};

const WIN_TITLE: Record<Win['label'], string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

async function getSummary(): Promise<Summary | null> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc('admin_visitor_summary');
    if (error || !data) {
      console.error('Visitor summary failed:', error?.message);
      return null;
    }
    return data as Summary;
  } catch (err) {
    console.error('Visitor summary threw:', err);
    return null;
  }
}

// "Visitor" = one browser, counted from the site's own tracking (no Google
// account needed). New = first time that browser was seen in the period.
export default async function VisitorSummary() {
  const summary = await getSummary();
  if (!summary) return null;

  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>WEBSITE VISITORS</div>
      <div className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {summary.windows.map((w) => (
          <div className={styles.stat} key={w.label}>
            <div className={styles.statValue}>{w.new}</div>
            <div className={styles.statLabel}>New visitors, {WIN_TITLE[w.label].toLowerCase()}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft, #888)', marginTop: 8 }}>
              {w.returning} came back · {w.views} page views
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Where new visitors came from (30 days)</h2>
          {summary.sources.length === 0 ? (
            <p style={{ color: 'var(--ink-soft, #888)' }}>No data yet.</p>
          ) : (
            <table className={styles.table}>
              <tbody>
                {summary.sources.map((s) => (
                  <tr key={s.source}>
                    <td>{s.source}</td>
                    <td style={{ textAlign: 'right' }}>{s.visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Most viewed pages (7 days)</h2>
          {summary.pages.length === 0 ? (
            <p style={{ color: 'var(--ink-soft, #888)' }}>No data yet.</p>
          ) : (
            <table className={styles.table}>
              <tbody>
                {summary.pages.map((p) => (
                  <tr key={p.page}>
                    <td>{p.page}</td>
                    <td style={{ textAlign: 'right' }}>{p.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
