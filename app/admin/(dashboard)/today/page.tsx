import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import { ddmmyyyyToIso } from '@/lib/jobsGrouping';
import { FUNNELS, FUNNEL_LABELS, AUDIENCE_LABELS, type Funnel, type Audience } from '@/lib/enquiryFields';
import { attentionReasons, istDate, nowMs, LEAD_STATUSES, PROPOSAL_LABELS, PAYMENT_LABELS } from '@/lib/admin/leadPipeline';
import styles from '../admin.module.css';
import SiteStatus from '@/components/admin/SiteStatus';
import { getNavCounts } from '@/lib/admin/getNavCounts';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; email: string; name: string | null; source: string | null; status: string; declined: boolean;
  follow_up_date: string | null; proposal_status: string; proposal_updated_at: string | null;
  payment_status: string; payment_updated_at: string | null; funnel: string | null; audience: string | null;
  organisation: string | null; service_interest: string | null; need: string | null;
};

const BALANCE_DUE_DAYS = 7; // terms: balance payable within 7 days of invoice date

export default async function TodayPage() {
  const supabase = getSupabaseAdmin();
  const now = nowMs();
  // Three independent reads: run them together.
  const [leadsRes, enqRes, invRes, navCounts] = await Promise.all([
    safeQuery<Row[]>(
      supabase.from('leads').select('id, email, name, source, status, declined, follow_up_date, proposal_status, proposal_updated_at, payment_status, payment_updated_at, funnel, audience, organisation, service_interest, need').eq('is_test', false),
      [], 'today leads'
    ),
    safeQuery<{ lead_id: string }[]>(supabase.from('enquiries').select('lead_id').not('lead_id', 'is', null), [], 'today enquiries'),
    safeQuery<{ id: string; invoice_no: string; date: string; client_name: string; balance: number }[]>(
      supabase.from('invoices').select('id, invoice_no, date, client_name, balance').is('deleted_at', null).neq('invoice_type', 'proforma').gt('balance', 0),
      [], 'today invoices'
    ),
    getNavCounts(),
  ]);
  const withEnquiry = new Set(enqRes.data.map((e) => e.lead_id));

  const items = leadsRes.data
    .map((l) => ({ l, reasons: attentionReasons({ ...l, hasEnquiry: withEnquiry.has(l.id) }, now) }))
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) => a.reasons[0].rank - b.reasons[0].rank || (a.l.follow_up_date ?? '9').localeCompare(b.l.follow_up_date ?? '9'));

  const dueInvoices = invRes.data
    .map((i) => ({ ...i, days: Math.floor((now - new Date(ddmmyyyyToIso(i.date)).getTime()) / 86_400_000) }))
    .filter((i) => Number.isFinite(i.days) && i.days > BALANCE_DUE_DAYS)
    .sort((a, b) => b.days - a.days);

  const open = leadsRes.data.filter((l) => !l.declined);
  const byStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, open.filter((l) => l.status === s).length]));
  const byFunnel = Object.fromEntries([...FUNNELS, 'none'].map((f) => [f, open.filter((l) => (l.funnel ?? 'none') === f && l.status !== 'lost').length]));
  const card = { border: '1px solid var(--line)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, minWidth: 90 } as const;
  const num = { display: 'block', fontSize: 22, color: 'var(--ink)', fontFamily: 'var(--display)' } as const;
  const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const overdueTotal = dueInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);
  const moderationTotal = navCounts.pendingTestimonials + navCounts.pendingStudentWork + navCounts.pendingPublications;
  const actionCount = items.length + dueInvoices.length + navCounts.failedEmails + moderationTotal;

  return (
    <>
      <div className={styles.todayHero}>
        <div>
          <div className="eyebrow">YAFT COMMAND CENTRE</div>
          <h1 className={styles.todayTitle}>Today, {istDate(now)}</h1>
          <p className={styles.todaySubtitle}>
            {actionCount > 0 ? `${actionCount} item${actionCount === 1 ? '' : 's'} need attention across sales, finance, email and moderation.` : 'Nothing urgent is waiting. Your operational queues are clear.'}
          </p>
        </div>
        <div className={styles.todayQuickActions}>
          <Link href="/admin/invoices" className={styles.adminActionPrimary}>+ New invoice</Link>
          <Link href="/admin/leads" className={styles.adminAction}>Open leads</Link>
          <Link href="/admin/inbox" className={styles.adminAction}>Open inbox</Link>
        </div>
      </div>

      <SiteStatus />

      {leadsRes.error && <p style={{ color: '#e55', fontFamily: 'var(--mono)', fontSize: 12 }}>Could not load leads: {leadsRes.error}</p>}

      <div className={styles.attentionGrid}>
        <Link href="/admin/leads" className={styles.attentionCard}>
          <span className={styles.attentionLabel}>Sales attention</span>
          <strong>{items.length}</strong>
          <small>lead{items.length === 1 ? '' : 's'} due or needing action</small>
        </Link>
        <Link href="/admin/invoices" className={styles.attentionCard} data-tone={dueInvoices.length > 0 ? 'red' : 'neutral'}>
          <span className={styles.attentionLabel}>Overdue balances</span>
          <strong>{money(overdueTotal)}</strong>
          <small>{dueInvoices.length} invoice{dueInvoices.length === 1 ? '' : 's'} past {BALANCE_DUE_DAYS} days</small>
        </Link>
        <Link href="/admin/emails" className={styles.attentionCard} data-tone={navCounts.failedEmails > 0 ? 'red' : 'neutral'}>
          <span className={styles.attentionLabel}>Email health</span>
          <strong>{navCounts.failedEmails}</strong>
          <small>unread failed email{navCounts.failedEmails === 1 ? '' : 's'}</small>
        </Link>
        <Link href="/admin/community" className={styles.attentionCard} data-tone={moderationTotal > 0 ? 'amber' : 'neutral'}>
          <span className={styles.attentionLabel}>Moderation queue</span>
          <strong>{moderationTotal}</strong>
          <small>testimonial / student work / publication</small>
        </Link>
      </div>

      <div className={styles.todaySectionHead}>
        <div>
          <div className="eyebrow">PIPELINE SNAPSHOT</div>
          <p>Open lead stages and funnels. These are context, not vanity totals.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        {LEAD_STATUSES.map((s) => (
          <div key={s} style={card}><span style={num}>{byStatus[s]}</span>{s}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
        {FUNNELS.map((f) => (
          <Link key={f} href={`/admin/leads?funnel=${f}`} style={card}><span style={num}>{byFunnel[f]}</span>{FUNNEL_LABELS[f as Funnel]} (open)</Link>
        ))}
        <Link href="/admin/leads?funnel=none" style={card}><span style={num}>{byFunnel.none}</span>no funnel recorded</Link>
      </div>

      <div className={styles.todaySectionHead}><div><div className="eyebrow">SALES ACTIONS</div><h2>Needs attention ({items.length})</h2></div><Link href="/admin/leads">View pipeline →</Link></div>
      {items.length === 0 ? (
        <p className={styles.empty}>Nothing needs you today.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Lead</th><th>Why</th><th>Who</th><th>Interest</th><th>Proposal</th><th>Payment</th><th>Next follow-up</th></tr></thead>
          <tbody>
            {items.map(({ l, reasons }) => (
              <tr key={l.id}>
                <td><Link href={`/admin/leads/${l.id}`} style={{ textDecoration: 'underline' }}>{l.name ?? l.email}</Link>{l.name && <div style={{ opacity: 0.55, fontSize: 11 }}>{l.email}</div>}</td>
                <td>{reasons.map((r) => <div key={r.reason}>{r.reason}</div>)}</td>
                <td>{[l.audience ? AUDIENCE_LABELS[l.audience as Audience] : null, l.organisation].filter(Boolean).join(', ') || '—'}</td>
                <td>{l.service_interest ?? l.need ?? '—'}</td>
                <td>{PROPOSAL_LABELS[l.proposal_status] ?? '—'}</td>
                <td>{PAYMENT_LABELS[l.payment_status] ?? '—'}</td>
                <td>{l.follow_up_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.todaySectionHead} style={{ marginTop: 32 }}><div><div className="eyebrow">FINANCE ACTIONS</div><h2>Invoice balances past {BALANCE_DUE_DAYS} days ({dueInvoices.length})</h2></div><Link href="/admin/invoices">Open invoices →</Link></div>
      {dueInvoices.length === 0 ? (
        <p className={styles.empty}>No overdue balances.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>Invoice</th><th>Client</th><th>Balance</th><th>Invoice date</th><th>Days since</th></tr></thead>
          <tbody>
            {dueInvoices.map((i) => (
              <tr key={i.id}><td>{i.invoice_no}</td><td>{i.client_name}</td><td>{money(Number(i.balance))}</td><td>{i.date}</td><td>{i.days}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
