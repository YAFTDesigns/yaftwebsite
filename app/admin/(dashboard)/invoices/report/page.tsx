import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeInvoiceTotals, type InvoiceLineItem } from '@/lib/invoiceMath';
import { ddmmyyyyToIso } from '@/lib/invoicesExport';
import { fyStartYearFor, fyLabel, currentFyStartYear, availableFyStartYears } from '@/lib/financialYear';
import styles from '../../admin.module.css';

export const dynamic = 'force-dynamic';

type InvoiceRow = {
  id: string;
  invoice_no: string;
  date: string;
  client_name: string;
  client_state: string | null;
  items: InvoiceLineItem[];
  total: number;
  balance: number;
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]; // FY order: Apr..Mar
const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December',
};

export default async function FinancialYearReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const { fy } = await searchParams;
  const supabase = getSupabaseAdmin();

  // Only confirmed revenue -- proformas were never real income, matching
  // isConfirmedRevenue()'s definition used everywhere else this session.
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, date, client_name, client_state, items, total, balance')
    .is('deleted_at', null)
    .neq('invoice_type', 'proforma')
    .order('date', { ascending: true });

  const allInvoices = (data ?? []) as InvoiceRow[];

  const selectedFy = fy && !Number.isNaN(Number(fy)) ? Number(fy) : currentFyStartYear();
  const availableYears = availableFyStartYears(allInvoices.map((i) => i.date));

  const fyInvoices = allInvoices.filter((inv) => fyStartYearFor(inv.date) === selectedFy);

  // Recomputed from items + client_state via the same single source of
  // truth used for the actual invoice, not read off a stored total --
  // invoices only store the final total, not a CGST/SGST/IGST split,
  // so this is the accurate way to get that breakdown, not a guess.
  const computed = fyInvoices.map((inv) => ({
    ...inv,
    totals: computeInvoiceTotals(inv.items ?? [], inv.client_state ?? ''),
    monthNum: Number(ddmmyyyyToIso(inv.date).split('-')[1]),
  }));

  const grand = computed.reduce(
    (acc, inv) => ({
      subtotal: acc.subtotal + inv.totals.subtotal,
      cgst: acc.cgst + inv.totals.cgst,
      sgst: acc.sgst + inv.totals.sgst,
      igst: acc.igst + inv.totals.igst,
      total: acc.total + inv.totals.total,
      balance: acc.balance + Number(inv.balance),
    }),
    { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0, balance: 0 }
  );

  const byMonth = MONTH_ORDER.map((m) => {
    const monthInvoices = computed.filter((inv) => inv.monthNum === m);
    return {
      month: m,
      count: monthInvoices.length,
      total: monthInvoices.reduce((s, inv) => s + inv.totals.total, 0),
    };
  });

  return (
    <div className={styles.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
        <div>
          <h1 className={styles.sectionTitle}>Financial Year Report</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Confirmed revenue only (proformas excluded). GST recomputed from each invoice&apos;s items and client state.
          </p>
        </div>
        <Link href="/admin/invoices" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--brass)' }}>← Back to Invoices</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '20px 0', flexWrap: 'wrap' }}>
        {availableYears.map((y) => (
          <Link
            key={y}
            href={`/admin/invoices/report?fy=${y}`}
            style={{
              fontFamily: 'var(--mono)', fontSize: 12, padding: '6px 14px', borderRadius: 6,
              border: `1px solid ${y === selectedFy ? 'var(--brass)' : '#2a2a2a'}`,
              color: y === selectedFy ? 'var(--brass)' : '#888',
              textDecoration: 'none',
            }}
          >
            {fyLabel(y)}
          </Link>
        ))}
      </div>

      {error && <p style={{ color: '#e55', fontFamily: 'var(--mono)', fontSize: 12 }}>Could not load invoices: {error.message}</p>}

      {!error && fyInvoices.length === 0 ? (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>No confirmed invoices in {fyLabel(selectedFy)} yet.</p>
      ) : !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, margin: '24px 0' }}>
            {[
              ['Invoices', String(fyInvoices.length)],
              ['Revenue (ex. GST)', `₹${fmt(grand.subtotal)}`],
              ['GST collected', `₹${fmt(grand.cgst + grand.sgst + grand.igst)}`],
              ['Total invoiced', `₹${fmt(grand.total)}`],
              ['Outstanding balance', `₹${fmt(grand.balance)}`],
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: '#fff' }}>{value}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 28, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
            <span>CGST: ₹{fmt(grand.cgst)}</span>
            <span>SGST: ₹{fmt(grand.sgst)}</span>
            <span>IGST: ₹{fmt(grand.igst)}</span>
          </div>

          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', marginBottom: 10 }}>Month by month</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Month</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Invoices</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.map((m) => (
                <tr key={m.month} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12 }}>{MONTH_NAMES[m.month]}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: m.count ? '#fff' : '#444' }}>{m.count || '—'}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: m.count ? '#fff' : '#444' }}>{m.total ? fmt(m.total) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <a
            href={`/api/admin/invoices/report-export?fy=${selectedFy}`}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', background: 'var(--brass)', border: 'none', borderRadius: 6, padding: '9px 16px', textDecoration: 'none', display: 'inline-block' }}
          >
            Download {fyLabel(selectedFy)} as Excel
          </a>
        </>
      )}
    </div>
  );
}
