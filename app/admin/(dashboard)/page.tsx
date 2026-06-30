import { getSupabaseAdmin } from '@/lib/supabase/admin';
import BarChart from '@/components/admin/BarChart';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

const SOURCES = ['syllabus_gate', 'contact_form'] as const;

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

async function getCounts() {
  const supabase = getSupabaseAdmin();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const [
    leads, enquiries, syllabusRequests, unlocks, leadsBySource,
    pendingTestimonials, enquiriesThisWeek,
    invoicesThisMonth, pendingStudentWork, pendingPublications,
    recentEnquiries, recentInvoices, failedEmails,
  ] = await Promise.all([
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
    supabase.from('enquiries').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('invoices').select('total, advance, balance').gte('created_at', monthStart),
    supabase.from('student_work').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('enquiries').select('name, email, course_interest, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('invoice_no, client_name, total, balance, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);

  const invoiceRows = invoicesThisMonth.data ?? [];
  const revenueThisMonth = invoiceRows.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const outstandingBalance = invoiceRows.reduce((sum, r) => sum + (r.balance ?? 0), 0);

  return {
    leads: leads.count ?? 0,
    enquiries: enquiries.count ?? 0,
    enquiriesThisWeek: enquiriesThisWeek.count ?? 0,
    syllabusRequests: syllabusRequests.count ?? 0,
    unlocks: unlocks.count ?? 0,
    leadsBySource: SOURCES.map((source, i) => ({ label: source, value: leadsBySource[i].count ?? 0 })),
    pendingTestimonials: pendingTestimonials.count ?? 0,
    invoicesThisMonth: invoiceRows.length,
    revenueThisMonth,
    outstandingBalance,
    pendingStudentWork: pendingStudentWork.count ?? 0,
    pendingPublications: pendingPublications.count ?? 0,
    failedEmails: failedEmails.count ?? 0,
    recentEnquiries: recentEnquiries.data ?? [],
    recentInvoices: recentInvoices.data ?? [],
  };
}

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function AdminOverviewPage() {
  const counts = await getCounts();
  const pendingTotal = counts.pendingTestimonials + counts.pendingStudentWork + counts.pendingPublications;

  return (
    <>
      <h1 className={styles.sectionTitle}>Overview</h1>

      {/* Needs attention — only shows if something is pending */}
      {(pendingTotal > 0 || counts.failedEmails > 0) && (
        <div style={{
          background: '#1a0808', border: '1px solid var(--brass)', borderRadius: 8,
          padding: '14px 20px', marginBottom: 32, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Needs attention
          </span>
          {counts.pendingTestimonials > 0 && (
            <a href="/admin/testimonials" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#fff', textDecoration: 'none' }}>
              {counts.pendingTestimonials} testimonial{counts.pendingTestimonials > 1 ? 's' : ''} →
            </a>
          )}
          {counts.pendingStudentWork > 0 && (
            <a href="/admin/community" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#fff', textDecoration: 'none' }}>
              {counts.pendingStudentWork} student submission{counts.pendingStudentWork > 1 ? 's' : ''} →
            </a>
          )}
          {counts.pendingPublications > 0 && (
            <a href="/admin/community" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#fff', textDecoration: 'none' }}>
              {counts.pendingPublications} publication{counts.pendingPublications > 1 ? 's' : ''} →
            </a>
          )}
          {counts.failedEmails > 0 && (
            <a href="/admin/emails" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#e55', textDecoration: 'none' }}>
              {counts.failedEmails} failed email{counts.failedEmails > 1 ? 's' : ''} →
            </a>
          )}
        </div>
      )}

      <div className="eyebrow" style={{ marginBottom: 16 }}>THIS MONTH</div>
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>₹{fmt(counts.revenueThisMonth)}</div>
          <div className={styles.statLabel}>Invoiced this month</div>
        </div>
        <div className={styles.stat} style={{ borderTopColor: counts.outstandingBalance > 0 ? 'var(--brass)' : undefined }}>
          <div className={styles.statValue} style={{ color: counts.outstandingBalance > 0 ? 'var(--brass)' : undefined }}>
            ₹{fmt(counts.outstandingBalance)}
          </div>
          <div className={styles.statLabel}>Outstanding balance</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.invoicesThisMonth}</div>
          <div className={styles.statLabel}>Invoices sent</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.enquiriesThisWeek}</div>
          <div className={styles.statLabel}>Enquiries this week</div>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 16 }}>ALL TIME</div>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        {/* Recent enquiries */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent enquiries</h2>
          {counts.recentEnquiries.length === 0
            ? <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>No enquiries yet.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {counts.recentEnquiries.map((e: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < counts.recentEnquiries.length - 1 ? '1px solid var(--line)' : 'none', paddingBottom: 10 }}>
                    <div>
                      <p style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{e.name}</p>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{e.course_interest || 'General enquiry'}</p>
                    </div>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{timeAgo(e.created_at)}</p>
                  </div>
                ))}
              </div>
          }
          <a href="/admin/enquiries" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--brass)', textDecoration: 'none', display: 'inline-block', marginTop: 14 }}>View all →</a>
        </div>

        {/* Recent invoices */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent invoices</h2>
          {counts.recentInvoices.length === 0
            ? <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>No invoices yet.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {counts.recentInvoices.map((inv: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < counts.recentInvoices.length - 1 ? '1px solid var(--line)' : 'none', paddingBottom: 10 }}>
                    <div>
                      <p style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{inv.client_name}</p>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>{inv.invoice_no}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>₹{fmt(inv.total)}</p>
                      {inv.balance > 0
                        ? <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--brass)' }}>₹{fmt(inv.balance)} due</p>
                        : <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#4caf50' }}>Paid</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
          }
          <a href="/admin/invoices" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--brass)', textDecoration: 'none', display: 'inline-block', marginTop: 14 }}>View all →</a>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 16 }}>LEAD SOURCE</div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Leads by how they came in</h2>
        <BarChart items={counts.leadsBySource} />
      </div>

      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 24 }}>
        See <strong>Leads</strong> for everyone who&apos;s unlocked a syllabus or submitted the contact form,{' '}
        <strong>Enquiries</strong> for contact form submissions, and <strong>Analytics</strong> for the page-view → unlock
        → enquiry funnel.
      </p>
    </>
  );
}
