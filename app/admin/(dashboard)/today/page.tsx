import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import { ddmmyyyyToIso } from '@/lib/invoicesExport';
import { FUNNELS, FUNNEL_LABELS, AUDIENCE_LABELS, type Funnel, type Audience } from '@/lib/enquiryFields';
import { attentionReasons, istDate, nowMs, LEAD_STATUSES, PROPOSAL_LABELS, PAYMENT_LABELS } from '@/lib/admin/leadPipeline';
import styles from '../admin.module.css';

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
  const leadsRes = await safeQuery<Row[]>(
    supabase.from('leads').select('id, email, name, source, status, declined, follow_up_date, proposal_status, proposal_updated_at, payment_status, payment_updated_at, funnel, audience, organisation, service_interest, need'),
    [], 'today leads'
  );
  const enqRes = await safeQuery<{ lead_id: string }[]>(supabase.from('enquiries').select('lead_id').not('lead_id', 'is', null), [], 'today enquiries');
  const withEnquiry = new Set(enqRes.data.map((e) => e.lead_id));

  const items = leadsRes.data
    .map((l) => ({ l, reasons: attentionReasons({ ...l, hasEnquiry: withEnquiry.has(l.id) }, now) }))
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) => a.reasons[0].rank - b.reasons[0].rank || (a.l.follow_up_date ?? '9').localeCompare(b.l.follow_up_date ?? '9'));

  const invRes = await safeQuery<{ id: string; invoice_no: string; date: string; client_name: string; balance: number }[]>(
    supabase.from('invoices').select('id, invoice_no, date, client_name, balance').is('deleted_at', null).neq('invoice_type', 'proforma').gt('balance', 0),
    [], 'today invoices'
  );
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

  return (
    <>
      <h1 className={styles.sectionTitle}>Today, {istDate(now)}</h1>

      {leadsRes.error && <p style={{ color: '#e55', fontFamily: 'var(--mono)', fontSize: 12 }}>Could not load leads: {leadsRes.error}</p>}

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

      <h2 className={styles.sectionTitle} style={{ fontSize: 18 }}>Needs attention ({items.length})</h2>
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

      <h2 className={styles.sectionTitle} style={{ fontSize: 18, marginTop: 32 }}>Invoice balances past {BALANCE_DUE_DAYS} days ({dueInvoices.length})</h2>
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
