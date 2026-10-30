import { computeInvoiceTotals, type InvoiceLineItem } from '@/lib/invoiceMath';
import { fyStartYearFor } from '@/lib/financialYear';
import { ddmmyyyyToIso } from '@/lib/jobsGrouping';

/**
 * Pure aggregation behind the Financial Year Report. Kept separate from the page so it can be tested
 * against synthetic data and reconciled against the source billing and payment rows.
 *
 * Conventions (unchanged from the original report):
 *  - A bill counts once, in the financial year of its bill date. Payments are NOT a second revenue line.
 *  - Proformas and test bills never count. Soft-deleted bills never count (filtered at query time).
 *  - GST is recomputed from the items and client state with computeInvoiceTotals().
 * Added for refunds: an ISSUED credit note reduces the financial year of its own date, never the
 * year of the bill it corrects. Refund records still awaiting review do not change any total.
 */

export type ReportInvoice = {
  id?: string; invoice_no: string; date: string; client_name: string; client_state: string | null;
  invoice_type?: string | null; items: InvoiceLineItem[]; total: number | string; balance: number | string;
  course_plan_id?: string | null; course_payment_id?: string | null;
};
export type ReportAdjustment = {
  id?: string; status: string; credit_note_no: string | null; issued_date: string | null;
  taxable: number | string | null; cgst: number | string | null; sgst: number | string | null; igst: number | string | null; total: number | string | null;
  invoice_id?: string | null; is_test?: boolean;
};

export const isCountedInvoice = (inv: Pick<ReportInvoice, 'invoice_type'>) => inv.invoice_type !== 'proforma' && inv.invoice_type !== 'test';
export const isIssuedCreditNote = (a: ReportAdjustment) => a.status === 'issued' && !!a.issued_date && !a.is_test;

const n = (v: number | string | null | undefined) => Number(v) || 0;
const r2 = (x: number) => Math.round(x * 100) / 100;

export type FySummary = {
  fy: number;
  invoiceCount: number;
  subtotal: number; cgst: number; sgst: number; igst: number; gst: number; total: number; balance: number;
  creditNoteCount: number; creditTaxable: number; creditGst: number; creditTotal: number;
  netSubtotal: number; netGst: number; netTotal: number;
  byMonth: { month: number; count: number; total: number; creditTotal: number }[];
};

const MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

export function summariseFy(fy: number, invoices: ReportInvoice[], adjustments: ReportAdjustment[]): FySummary {
  const inv = invoices.filter(isCountedInvoice).filter((i) => fyStartYearFor(i.date) === fy).map((i) => ({
    i, totals: computeInvoiceTotals(i.items ?? [], i.client_state ?? ''), month: Number(ddmmyyyyToIso(i.date).split('-')[1]),
  }));
  const cns = adjustments.filter(isIssuedCreditNote).filter((a) => fyStartYearFor(a.issued_date!) === fy).map((a) => ({
    a, month: Number(ddmmyyyyToIso(a.issued_date!).split('-')[1]),
  }));
  const sum = (f: (x: (typeof inv)[number]) => number) => inv.reduce((s, x) => s + f(x), 0);
  const subtotal = sum((x) => x.totals.subtotal), cgst = sum((x) => x.totals.cgst), sgst = sum((x) => x.totals.sgst), igst = sum((x) => x.totals.igst);
  const total = sum((x) => x.totals.total);
  const creditTaxable = cns.reduce((s, x) => s + n(x.a.taxable), 0);
  const creditGst = cns.reduce((s, x) => s + n(x.a.cgst) + n(x.a.sgst) + n(x.a.igst), 0);
  const creditTotal = cns.reduce((s, x) => s + n(x.a.total), 0);
  return {
    fy, invoiceCount: inv.length, subtotal, cgst, sgst, igst, gst: cgst + sgst + igst, total, balance: sum((x) => n(x.i.balance)),
    creditNoteCount: cns.length, creditTaxable, creditGst, creditTotal,
    netSubtotal: r2(subtotal - creditTaxable), netGst: r2(cgst + sgst + igst - creditGst), netTotal: r2(total - creditTotal),
    byMonth: MONTH_ORDER.map((m) => ({
      month: m,
      count: inv.filter((x) => x.month === m).length,
      total: inv.filter((x) => x.month === m).reduce((s, x) => s + x.totals.total, 0),
      creditTotal: cns.filter((x) => x.month === m).reduce((s, x) => s + n(x.a.total), 0),
    })),
  };
}

// ---- Reconciliation of the source billing/payment records ----

export type PaymentRow = {
  id: string; plan_id: string; kind: string; status: string; amount_minor: number | string; payment_id: string | null;
  invoice_id: string | null; invoice_no: string | null; sync_status: string; test_mode?: boolean;
};
export type RefundRow = {
  id: string; payment_row_id: string | null; invoice_id: string | null; refund_minor: number | string; status: string; total: number | string | null; is_test?: boolean;
};
export type Mismatch = { severity: 'high' | 'medium'; where: string; message: string };

/** Cross-checks payments, the bills they produced and refunds. An empty list means the records agree. */
export function reconcilePlans(payments: PaymentRow[], invoices: (ReportInvoice & { id: string })[], refunds: RefundRow[]): Mismatch[] {
  const out: Mismatch[] = [];
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const invByPayment = new Map<string, (ReportInvoice & { id: string })[]>();
  for (const i of invoices) if (i.course_payment_id) invByPayment.set(i.course_payment_id, [...(invByPayment.get(i.course_payment_id) ?? []), i]);

  for (const p of payments.filter((x) => x.status === 'paid')) {
    const bills = invByPayment.get(p.id) ?? [];
    if (bills.length === 0) out.push({ severity: 'high', where: p.payment_id ?? p.id, message: `Paid ${p.kind} has no bill. Use Retry.` });
    if (bills.length > 1) out.push({ severity: 'high', where: p.payment_id ?? p.id, message: `Paid ${p.kind} has ${bills.length} bills (duplicate).` });
    for (const b of bills) {
      if (Math.round(n(b.total) * 100) !== n(p.amount_minor)) out.push({ severity: 'high', where: b.invoice_no, message: `Bill total ₹${n(b.total)} differs from the payment of ₹${n(p.amount_minor) / 100}.` });
      if (n(b.balance) !== 0) out.push({ severity: 'medium', where: b.invoice_no, message: `Bill shows a balance of ₹${n(b.balance)} but its payment is complete.` });
    }
    if (p.sync_status === 'failed' || p.sync_status === 'mismatch') out.push({ severity: 'high', where: p.payment_id ?? p.id, message: `Sync status is ${p.sync_status}.` });
  }
  // A plan paid both ways (full AND advance/balance) means the client was charged twice for the same fee.
  const byPlan = new Map<string, Set<string>>();
  for (const p of payments.filter((x) => x.status === 'paid')) byPlan.set(p.plan_id, (byPlan.get(p.plan_id) ?? new Set()).add(p.kind));
  for (const [plan, kinds] of byPlan) if (kinds.has('full') && (kinds.has('advance') || kinds.has('balance'))) out.push({ severity: 'high', where: plan.slice(0, 8), message: 'Plan was paid in full AND in instalments. Refund the extra amount and raise a credit note.' });
  for (const r of refunds) {
    const pay = payments.find((p) => p.id === r.payment_row_id);
    if (pay && n(r.refund_minor) > n(pay.amount_minor)) out.push({ severity: 'high', where: pay.payment_id ?? pay.id, message: 'Refund is larger than the payment.' });
    if (r.status === 'issued' && !r.is_test) {
      const bill = r.invoice_id ? invById.get(r.invoice_id) : undefined;
      if (bill && n(r.total) > n(bill.total)) out.push({ severity: 'high', where: bill.invoice_no, message: 'Credit note is larger than the bill it corrects.' });
    }
    if (r.status === 'needs_review') out.push({ severity: 'medium', where: pay?.payment_id ?? r.id, message: 'Refund received from Razorpay, no credit note issued yet.' });
  }
  return out;
}

/** Credit note amounts for a refund: same tax mode as the bill, GST backed out of the gross refund. */
export function creditNoteFromRefund(refundMinor: number, clientState: string): { taxable: number; cgst: number; sgst: number; igst: number; total: number } {
  const total = Math.round(refundMinor) / 100;
  const taxable = Math.round((total / 1.18) * 100) / 100;
  const gst = Math.round((total - taxable) * 100) / 100;
  const intra = (clientState || '').toLowerCase().includes('tamil');
  const half = Math.round((gst / 2) * 100) / 100;
  return { taxable, cgst: intra ? half : 0, sgst: intra ? Math.round((gst - half) * 100) / 100 : 0, igst: intra ? 0 : gst, total };
}
