import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type Lead = {
  id: string;
  email: string;
  name: string | null;
  linkedin_url: string | null;
  source: string | null;
  first_seen: string;
  last_seen: string;
};

type TimeOnSite = { seconds: number; pageViews: number } | null;

async function getLeads(): Promise<{ leads: Lead[]; error: string | null; timeOnSite: Record<string, TimeOnSite> }> {
  const supabase = getSupabaseAdmin();
  const result = await safeQuery<Lead[]>(
    supabase
      .from('leads')
      .select('id, email, name, linkedin_url, source, first_seen, last_seen')
      .order('last_seen', { ascending: false }),
    [],
    'leads list'
  );

  // Loading this page counts as having seen the new leads, so clear
  // the nav badge for them. Fire-and-forget: same as the emails page,
  // not worth failing the page load if this update hiccups.
  supabase
    .from('leads')
    .update({ viewed_at: new Date().toISOString() })
    .is('viewed_at', null)
    .then(({ error }) => {
      if (error) console.error('[leads] failed to mark leads viewed:', error);
    });

  // Time on site is derived from page_view events tagged with lead_id
  // (see lib/leads.ts) -- only present for leads who identified
  // themselves after session-linking shipped. Older leads won't have
  // any tagged events, which the UI shows as "no data" rather than 0.
  const timeOnSite: Record<string, TimeOnSite> = {};
  const leadIds = result.data.map((l) => l.id);
  if (leadIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('lead_id, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: true });

    if (eventsError) {
      console.error('[leads] failed to load analytics_events for time-on-site:', eventsError);
    } else {
      const byLead = new Map<string, string[]>();
      for (const row of events ?? []) {
        const id = row.lead_id as string;
        if (!byLead.has(id)) byLead.set(id, []);
        byLead.get(id)!.push(row.created_at as string);
      }
      for (const [id, timestamps] of byLead) {
        const first = new Date(timestamps[0]).getTime();
        const last = new Date(timestamps[timestamps.length - 1]).getTime();
        timeOnSite[id] = { seconds: Math.round((last - first) / 1000), pageViews: timestamps.length };
      }
    }
  }

  return { leads: result.data, error: result.error, timeOnSite };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

function formatSeen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminLeadsPage() {
  const { leads, error, timeOnSite } = await getLeads();

  return (
    <>
      <h1 className={styles.sectionTitle}>Leads ({leads.length})</h1>

      {error && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Could not load leads: {error}
          </p>
        </div>
      )}

      {leads.length === 0 ? (
        <p className={styles.empty}>{error ? 'No data available right now.' : 'No leads yet.'}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>LinkedIn</th>
              <th>Source</th>
              <th>Time on site</th>
              <th>First seen</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>{lead.email}</td>
                <td>{lead.name ?? '—'}</td>
                <td>
                  {lead.linkedin_url ? (
                    <a href={lead.linkedin_url} target="_blank" rel="noopener" style={{ color: 'var(--blueprint)' }}>
                      Profile →
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{lead.source ?? '—'}</td>
                <td>
                  {timeOnSite[lead.id] ? (
                    <>
                      {formatDuration(timeOnSite[lead.id]!.seconds)}{' '}
                      <span style={{ opacity: 0.5, fontSize: '0.85em' }}>
                        ({timeOnSite[lead.id]!.pageViews} views)
                      </span>
                    </>
                  ) : (
                    <span title="No tracked visits since this lead identified themselves">— no data</span>
                  )}
                </td>
                <td>{formatSeen(lead.first_seen)}</td>
                <td>{formatSeen(lead.last_seen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
