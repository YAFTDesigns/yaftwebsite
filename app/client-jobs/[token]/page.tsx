import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { attachStatusDates } from '@/lib/jobStatusDates';
import { STATUS_COLORS_HEX } from '@/lib/jobsGrouping';
import styles from './jobsheet.module.css';

export const dynamic = 'force-dynamic';

// Page-view sibling of the Excel download at /api/share/jobs/[token],
// same token, same "anyone with the link" model. Unlike the team job
// sheet, this one DOES show pricing -- it's the client's own bill,
// not internal work-queue info, so hiding it here would make the page
// less useful than the spreadsheet it's meant to complement. Read-only:
// no forms, no buttons that write anything, nothing to click but the
// Excel download link. noindex'd since the token is the only gate.
export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

const GST_LABEL: Record<string, string> = { intra: 'Intra-state (CGST+SGST)', inter: 'Inter-state (IGST)', none: 'No GST' };

type JobDisplayRow = {
  id: string;
  job_no: string | null;
  job_date: string;
  job_type: string;
  qty: number;
  rate: number;
  gst_type: string;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: string;
  status_date: string | null;
  notes: string | null;
};

function fmt(n: number) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default async function ClientJobSheetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const supabase = getSupabaseAdmin();
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('share_token', token)
    .is('deleted_at', null)
    .maybeSingle();

  if (!client) notFound();

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_no, job_date, job_type, qty, rate, gst_type, cgst, sgst, igst, total, status, notes')
    .eq('client_id', client.id)
    .is('deleted_at', null)
    .order('job_date', { ascending: false });

  if (error) {
    return (
      <main className={styles.page}>
        <p className={styles.error}>Couldn&apos;t load your job list right now — try refreshing in a moment.</p>
      </main>
    );
  }

  const rows = await attachStatusDates(supabase, (jobs ?? []) as JobDisplayRow[]);
  const grandTotal = rows.reduce((s, j) => s + Number(j.total), 0);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>YAFT Designs</p>
          <h1 className={styles.title}>Job List</h1>
          <p className={styles.subtitle}>{client.name}</p>
        </div>
        <a href={`/api/share/jobs/${token}`} className={styles.downloadLink}>
          Download as Excel ↓
        </a>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No jobs on file yet.</p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Job No</th>
                  <th>Date</th>
                  <th>Job Type</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>GST</th>
                  <th>Total</th>
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
                    <td>{j.job_type}</td>
                    <td className={styles.mono}>{j.qty}</td>
                    <td className={styles.mono}>{fmt(j.rate)}</td>
                    <td>{GST_LABEL[j.gst_type] ?? j.gst_type}</td>
                    <td className={styles.mono}>{fmt(j.total)}</td>
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
          <p className={styles.grandTotal}>Total across all jobs: <span>INR {fmt(grandTotal)}</span></p>
        </>
      )}
    </main>
  );
}
