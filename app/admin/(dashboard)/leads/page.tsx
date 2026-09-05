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
  //
  // Queries the lead_time_on_site view (aggregated at the DB level:
  // min/max/count per lead_id) rather than fetching raw analytics_events
  // rows. This used to pull every raw event ordered oldest-first with
  // no limit -- once the table passed Supabase's default 1000-row cap,
  // the newest events (including live, current leads) were silently
  // dropped and showed "No data yet" despite the data existing. The
  // view returns at most one row per lead, which the row cap can't
  // realistically catch up to the way raw-row fetching eventually would.
  const timeOnSite: Record<string, TimeOnSite> = {};
  const leadIds = result.data.map((l) => l.id);
  if (leadIds.length > 0) {
    const { data: rows, error: eventsError } = await supabase
      .from('lead_time_on_site')
      .select('lead_id, first_event, last_event, event_count')
      .in('lead_id', leadIds);

    if (eventsError) {
      console.error('[leads] failed to load lead_time_on_site for time-on-site:', eventsError);
    } else {
      for (const row of rows ?? []) {
        const first = new Date(row.first_event as string).getTime();
        const last = new Date(row.last_event as string).getTime();
        timeOnSite[row.lead_id as string] = {
          seconds: Math.round((last - first) / 1000),
          pageViews: row.event_count as number,
        };
      }
    }
  }

  return { leads: result.data, error: result.error, timeOnSite };
}

// Below 24h, a precise duration is a plausible single session and
// genuinely informative. At or past 24h, it's virtually certain to be
// someone who visited on separate days -- reporting that as "87h"
// reads like one continuous sitting, which nobody does. Switch to
// naming the actual span honestly instead of a duration that implies
// something false about how the time was spent.
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `Seen over ${days} day${days === 1 ? '' : 's'}${remHrs > 0 ? ` ${remHrs}h` : ''}`;
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
                    <span title="No tracked visits since this lead identified themselves">No data yet</span>
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
