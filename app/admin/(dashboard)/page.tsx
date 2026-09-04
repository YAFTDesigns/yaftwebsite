import { getSupabaseAdmin } from '@/lib/supabase/admin';
import SiteStatus from '@/components/admin/SiteStatus';
import BarChart from '@/components/admin/BarChart';
import PieChart from '@/components/admin/PieChart';
import LineChart from '@/components/admin/LineChart';
import EmailInvoicesWidget from '@/components/admin/EmailInvoicesWidget';
import { computeInvoiceTotals, type InvoiceLineItem } from '@/lib/invoiceMath';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

const SOURCES = ['syllabus_gate', 'contact_form', 'whatsapp_gate'] as const;
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Matches the exact columns each query below actually selects -- not
// the full invoices/enquiries row shape, just what this page reads.
type InvoiceMonthRow = { total: number; advance: number; balance: number; items: InvoiceLineItem[]; client_state: string };
type InvoiceSixMonthRow = { total: number; items: InvoiceLineItem[]; client_state: string; created_at: string };
type RecentEnquiryRow = { name: string; email: string; course_interest: string | null; created_at: string };
type RecentInvoiceRow = { invoice_no: string; client_name: string; total: number; balance: number; created_at: string };
type SelectableInvoiceRow = { id: string; invoice_no: string; date: string; client_name: string; total: number };
type TeamOption = { id: string; name: string; email: string | null };

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

function sixMonthsAgoStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 5, 1).toISOString();
}

// NOTE: This duplicates the logic in lib/admin/safeQuery.ts, which was
// extracted afterward as the shared utility for other admin pages
// (Leads, Enquiries, Analytics). Left as its own local implementation
// here deliberately rather than refactored, since this exact version
// is the one currently verified working in production for the Overview
// dashboard — changing it carries real risk for no functional gain.
// Wraps a Supabase query so a missing table / RLS error / network blip
// degrades to an empty result instead of crashing the whole dashboard.
async function safe<T>(promise: PromiseLike<{ data: T | null; count?: number | null; error?: { message?: string } | null }>, fallback: T) {
  try {
    const res = await promise;
    if (res.error) {
      console.error('Admin overview query failed:', res.error.message ?? res.error);
      return { data: fallback, count: 0 };
    }
    return { data: res.data ?? fallback, count: res.count ?? 0 };
  } catch (err) {
    console.error('Admin overview query threw:', err);
    return { data: fallback, count: 0 };
  }
}

// Proforma invoices are quotes, not committed revenue -- they never
// count toward the month's invoice count, the recent-activity feed,
// or the 6-month trend, regardless of whether an advance has been
// recorded on them. The "Convert to Invoice" action is the one true
// signal that a proforma became real -- it creates a genuine
// training/consultancy invoice row, which naturally shows up here on
// its own since it isn't type 'proforma' at all. Until that
// conversion happens, the proforma itself stays excluded here no
// matter its advance status. This does NOT affect /admin/invoices
// itself -- proforma quotes still show up there normally, this only
// keeps them off the summary dashboard.
async function getCounts() {
  const supabase = getSupabaseAdmin();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const sixMoStart = sixMonthsAgoStart();

  const [
    leads, enquiries, syllabusRequests, unlocks, whatsappClicks, leadsBySource,
    pendingTestimonials, enquiriesThisWeek,
    invoicesThisMonth, pendingStudentWork, pendingPublications,
    recentEnquiries, recentInvoices, failedEmails,
    sixMonthInvoices, selectableInvoices, accountantOptions,
  ] = await Promise.all([
    safe(supabase.from('leads').select('id', { count: 'exact', head: true }), null),
    safe(supabase.from('enquiries').select('id', { count: 'exact', head: true }), null),
    safe(supabase.from('syllabus_requests').select('id', { count: 'exact', head: true }), null),
    safe(supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'course_gate_unlock'), null),
    safe(supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'whatsapp_click'), null),
    Promise.all(
      SOURCES.map((source) =>
        safe(supabase.from('leads').select('id', { count: 'exact', head: true }).eq('source', source), null)
      )
    ),
    safe(supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null), null),
    safe(supabase.from('enquiries').select('id', { count: 'exact', head: true }).gte('created_at', weekStart), null),
    safe<InvoiceMonthRow[]>(supabase.from('invoices').select('total, advance, balance, items, client_state').is('deleted_at', null).gte('created_at', monthStart).neq('invoice_type', 'proforma'), []),
    safe(supabase.from('student_work').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null), null),
    safe(supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null), null),
    safe<RecentEnquiryRow[]>(supabase.from('enquiries').select('name, email, course_interest, created_at').order('created_at', { ascending: false }).limit(5), []),
    safe<RecentInvoiceRow[]>(supabase.from('invoices').select('invoice_no, client_name, total, balance, created_at').is('deleted_at', null).neq('invoice_type', 'proforma').order('created_at', { ascending: false }).limit(5), []),
    safe(supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed').is('viewed_at', null), null),
    safe<InvoiceSixMonthRow[]>(supabase.from('invoices').select('total, items, client_state, created_at').is('deleted_at', null).gte('created_at', sixMoStart).neq('invoice_type', 'proforma'), []),
    // Feeds the "Email invoices to accountant" widget -- this month's
    // real invoices only (proformas excluded here too, matching the
    // rest of this dashboard), with the actual id so the widget can
    // send a hand-picked subset, not just a whole month at once.
    safe<SelectableInvoiceRow[]>(supabase.from('invoices').select('id, invoice_no, date, client_name, total').is('deleted_at', null).neq('invoice_type', 'proforma').gte('created_at', monthStart).order('created_at', { ascending: false }), []),
    safe<TeamOption[]>(supabase.from('team_members').select('id, name, email').eq('active', true).is('deleted_at', null).order('name', { ascending: true }), []),
  ]);

  const invoiceRows = invoicesThisMonth.data ?? [];
  // Revenue is shown pre-tax; GST collected is a pass-through to the
  // government, not YAFT's income, so lumping it into "revenue" would
  // overstate actual earnings. total already includes tax (see
  // lib/invoiceMath.ts), so subtotal is recomputed from items rather
  // than relying on a stored pre-tax figure (no such column exists).
  const invoiceBreakdowns = invoiceRows.map((r) => computeInvoiceTotals(r.items ?? [], r.client_state ?? ''));
  const revenueThisMonth = invoiceBreakdowns.reduce((sum, b) => sum + b.subtotal, 0);
  const taxThisMonth = invoiceBreakdowns.reduce((sum, b) => sum + (b.cgst + b.sgst + b.igst), 0);
  const outstandingBalance = invoiceRows.reduce((sum, r) => sum + (r.balance ?? 0), 0);

  // Build 6-month revenue trend (pre-tax, same reasoning as above)
  const now = new Date();
  const monthlyTotals: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = MONTH_LABELS[d.getMonth()];
    const sum = (sixMonthInvoices.data ?? [])
      .filter((r) => {
        const rd = new Date(r.created_at);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      })
      .reduce((s, r) => s + computeInvoiceTotals(r.items ?? [], r.client_state ?? '').subtotal, 0);
    monthlyTotals.push({ label, value: sum });
  }

  // Enquiry source breakdown for pie chart
  const enquirySourceSlices = [
    { label: 'Syllabus gate', value: leadsBySource[0].count ?? 0, color: 'var(--blueprint)' },
    { label: 'Contact form', value: leadsBySource[1].count ?? 0, color: 'var(--brass)' },
    { label: 'WhatsApp gate', value: leadsBySource[2].count ?? 0, color: '#25D366' },
  ];

  return {
    leads: leads.count ?? 0,
    enquiries: enquiries.count ?? 0,
    enquiriesThisWeek: enquiriesThisWeek.count ?? 0,
    syllabusRequests: syllabusRequests.count ?? 0,
    unlocks: unlocks.count ?? 0,
    whatsappClicks: whatsappClicks.count ?? 0,
    leadsBySource: SOURCES.map((source, i) => ({ label: source, value: leadsBySource[i].count ?? 0 })),
    enquirySourceSlices,
    monthlyRevenue: monthlyTotals,
    pendingTestimonials: pendingTestimonials.count ?? 0,
    invoicesThisMonth: invoiceRows.length,
    revenueThisMonth,
    taxThisMonth,
    outstandingBalance,
    pendingStudentWork: pendingStudentWork.count ?? 0,
    pendingPublications: pendingPublications.count ?? 0,
    failedEmails: failedEmails.count ?? 0,
    recentEnquiries: recentEnquiries.data ?? [],
    recentInvoices: recentInvoices.data ?? [],
    selectableInvoices: selectableInvoices.data ?? [],
    accountantOptions: accountantOptions.data ?? [],
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
      <SiteStatus />

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
        <div className={styles.stat}>
          <div className={styles.statValue} style={{ color: 'var(--ink-soft, #888)' }}>₹{fmt(counts.taxThisMonth)}</div>
          <div className={styles.statLabel}>Tax collected (GST)</div>
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
        <div className={styles.stat}>
          <div className={styles.statValue}>{counts.whatsappClicks}</div>
          <div className={styles.statLabel}>WhatsApp button clicks</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48 }}>
        {/* Recent enquiries */}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Recent enquiries</h2>
          {counts.recentEnquiries.length === 0
            ? <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>No enquiries yet.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {counts.recentEnquiries.map((e, i: number) => (
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
                {counts.recentInvoices.map((inv, i: number) => (
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 48 }}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Revenue trend — last 6 months</h2>
          <LineChart
            points={counts.monthlyRevenue}
            currencyPrefix="₹"
          />
        </div>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Leads by source</h2>
          <PieChart slices={counts.enquirySourceSlices} size={140} />
          <EmailInvoicesWidget invoices={counts.selectableInvoices} accountants={counts.accountantOptions} />
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
