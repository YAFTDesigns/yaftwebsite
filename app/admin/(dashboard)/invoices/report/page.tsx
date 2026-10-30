import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fyLabel, currentFyStartYear, availableFyStartYears } from '@/lib/financialYear';
import { summariseFy, isCountedInvoice, isIssuedCreditNote, type ReportInvoice, type ReportAdjustment } from '@/lib/fyReport';
import styles from '../../admin.module.css';
import { fmtFixed2 } from '@/lib/format';

export const dynamic = 'force-dynamic';

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

  // Only confirmed revenue: proformas and test bills never count (see lib/fyReport.ts).
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, date, client_name, client_state, invoice_type, items, total, balance, course_plan_id, course_payment_id')
    .is('deleted_at', null)
    .neq('invoice_type', 'proforma')
    .order('date', { ascending: true });
  // Issued credit notes (refund corrections). Shown in the year they are issued.
  const { data: adjData } = await supabase.from('invoice_adjustments').select('id, status, credit_note_no, issued_date, taxable, cgst, sgst, igst, total, invoice_id, is_test').eq('status', 'issued');

  const allInvoices = ((data ?? []) as ReportInvoice[]).filter(isCountedInvoice);
  const adjustments = (adjData ?? []) as ReportAdjustment[];

  const selectedFy = fy && !Number.isNaN(Number(fy)) ? Number(fy) : currentFyStartYear();
  const availableYears = availableFyStartYears([...allInvoices.map((i) => i.date), ...adjustments.filter(isIssuedCreditNote).map((a) => a.issued_date!)]);

  const sum = summariseFy(selectedFy, allInvoices, adjustments);
  const fyInvoices = { length: sum.invoiceCount };
  const grand = sum;
  const byMonth = sum.byMonth;

  return (
    <div className={styles.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
        <div>
          <h1 className={styles.sectionTitle}>Financial Year Report</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
            Confirmed revenue only (proformas and test bills excluded). GST recomputed from each invoice&apos;s items and client state. Each bill counts once, in the year of its own date. Credit notes reduce the year they are issued.
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
              ['Revenue (ex. GST)', `₹${fmtFixed2(grand.subtotal)}`],
              ['GST collected', `₹${fmtFixed2(grand.cgst + grand.sgst + grand.igst)}`],
              ['Total invoiced', `₹${fmtFixed2(grand.total)}`],
              ['Outstanding balance', `₹${fmtFixed2(grand.balance)}`],
              ...(sum.creditNoteCount ? [['Credit notes', `-₹${fmtFixed2(sum.creditTotal)}`], ['Net total', `₹${fmtFixed2(sum.netTotal)}`]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: '#fff' }}>{value}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 28, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)' }}>
            <span>CGST: ₹{fmtFixed2(grand.cgst)}</span>
            <span>SGST: ₹{fmtFixed2(grand.sgst)}</span>
            <span>IGST: ₹{fmtFixed2(grand.igst)}</span>
            {sum.creditNoteCount > 0 && <span>Credit notes: {sum.creditNoteCount} (taxable ₹{fmtFixed2(sum.creditTaxable)}, GST ₹{fmtFixed2(sum.creditGst)})</span>}
          </div>

          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', marginBottom: 10 }}>Month by month</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Month</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Invoices</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Total (₹)</th>
                {sum.creditNoteCount > 0 && <th style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>Credit notes (₹)</th>}
              </tr>
            </thead>
            <tbody>
              {byMonth.map((m, i) => (
                <tr key={m.month} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 1 ? 'var(--paper-2, #111)' : 'transparent' }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12 }}>{MONTH_NAMES[m.month]}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: m.count ? '#fff' : '#444' }}>{m.count || '—'}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: m.count ? '#fff' : '#444' }}>{m.total ? fmtFixed2(m.total) : '—'}</td>
                  {sum.creditNoteCount > 0 && <td style={{ padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: m.creditTotal ? '#e55' : '#444' }}>{m.creditTotal ? `-${fmtFixed2(m.creditTotal)}` : '—'}</td>}
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
