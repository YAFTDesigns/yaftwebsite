import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { attachStatusDates } from '@/lib/jobStatusDates';
import { STATUS_COLORS_HEX } from '@/lib/jobsGrouping';
import styles from './jobsheet.module.css';

export const dynamic = 'force-dynamic';

// Same token, same "anyone with the link" model as the Excel version
// at /api/share/team-jobs/[token] -- this is the page-view sibling of
// that route for people (designers) who'd rather glance at a page
// than download and open a spreadsheet. Deliberately read-only: no
// forms, no buttons that write anything, nothing to click but the
// Excel download link for anyone who still wants the file. noindex'd
// since the token is the only thing gating it, same reasoning as
// every other share-link page on the site.
export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

type JobDisplayRow = {
  id: string;
  job_no: string | null;
  job_date: string;
  client_name: string;
  job_type: string;
  status: string;
  status_date: string | null;
  notes: string | null;
  designer_name: string | null;
};

export default async function TeamJobSheetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const supabase = getSupabaseAdmin();
  const { data: member } = await supabase
    .from('team_members')
    .select('id, name')
    .eq('share_token', token)
    .is('deleted_at', null)
    .maybeSingle();

  if (!member) notFound();

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_no, job_date, client_name, job_type, status, notes, designer_name')
    .is('deleted_at', null)
    .order('job_date', { ascending: false });

  if (error) {
    return (
      <main className={styles.page}>
        <p className={styles.error}>Couldn&apos;t load the job sheet right now — try refreshing in a moment.</p>
      </main>
    );
  }

  const rows = await attachStatusDates(supabase, (jobs ?? []) as JobDisplayRow[]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>YAFT Designs</p>
          <h1 className={styles.title}>Job Sheet</h1>
          <p className={styles.subtitle}>Every active job, no pricing — for {member.name}.</p>
        </div>
        <a href={`/api/share/team-jobs/${token}`} className={styles.downloadLink}>
          Download as Excel ↓
        </a>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No active jobs right now.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Job No</th>
                <th>Date</th>
                <th>Client</th>
                <th>Job Type</th>
                <th>Designer</th>
                <th>Status</th>
                <th>Status Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id}>
                  <td className={styles.mono}>{j.job_no || '—'}</td>
                  <td className={styles.mono}>{j.job_date}</td>
                  <td>{j.client_name}</td>
                  <td>{j.job_type}</td>
                  <td>{j.designer_name || <span className={styles.unassigned}>Unassigned</span>}</td>
                  <td>
                    <span
                      className={styles.statusPill}
                      style={{ background: STATUS_COLORS_HEX[j.status] ?? '#555' }}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className={styles.mono}>
                    {j.status_date ? new Date(j.status_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className={styles.notes}>{j.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
