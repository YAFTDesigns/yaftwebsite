import { describe, it, expect } from 'vitest';
import { summariseFy, reconcilePlans, creditNoteFromRefund, type ReportInvoice, type ReportAdjustment, type PaymentRow } from './fyReport';
import { computeSchedule } from './coursePayments';

const bill = (no: string, date: string, base: number, extra: Partial<ReportInvoice> = {}): ReportInvoice & { id: string } => ({
  id: no, invoice_no: no, date, client_name: 'SYNTHETIC Student', client_state: 'Tamil Nadu', invoice_type: 'training',
  items: [{ desc: 'Course', qty: 1, rate: base }], total: Math.round(base * 1.18 * 100) / 100, balance: 0, ...extra,
});

describe('summariseFy: two bills for one enrolment', () => {
  const s = computeSchedule(30000, 15000);
  const adv = bill('YAFT-032026-01', '20/03/2026', 15000, { course_plan_id: 'plan1', course_payment_id: 'pay1' });
  const bal = bill('YAFT-042026-01', '10/04/2026', 15000, { course_plan_id: 'plan1', course_payment_id: 'pay2' });

  it('puts each bill in the FY of its own date (advance FY25-26, balance FY26-27)', () => {
    const a = summariseFy(2025, [adv, bal], []);
    const b = summariseFy(2026, [adv, bal], []);
    expect(a.invoiceCount).toBe(1); expect(a.total).toBe(17700); expect(a.gst).toBe(2700);
    expect(b.invoiceCount).toBe(1); expect(b.total).toBe(17700);
    expect(a.total + b.total).toBe(s.total.total / 1); // 35,400 across both years, counted once each
  });
  it('does not count revenue twice', () => {
    const both = summariseFy(2025, [adv, bal], []).total + summariseFy(2026, [adv, bal], []).total;
    expect(both).toBe(35400);
  });
  it('ignores proforma and test bills', () => {
    const noise = [bill('PF-1', '20/03/2026', 99999, { invoice_type: 'proforma' }), bill('T-1', '20/03/2026', 88888, { invoice_type: 'test' })];
    expect(summariseFy(2025, [adv, ...noise], []).total).toBe(17700);
  });
});

describe('credit notes and cross-year refunds', () => {
  const adv = bill('YAFT-032026-01', '20/03/2026', 15000);
  const cn = (over: Partial<ReportAdjustment> = {}): ReportAdjustment => ({ status: 'issued', credit_note_no: 'CN-042026-01', issued_date: '15/04/2026', ...creditNoteFromRefund(590000, 'Tamil Nadu'), ...over });

  it('a partial refund of 5,900 issued in the next FY reduces that FY, not the bill year', () => {
    expect(summariseFy(2025, [adv], [cn()]).netTotal).toBe(17700);
    const next = summariseFy(2026, [adv], [cn()]);
    expect(next.creditTotal).toBe(5900); expect(next.netTotal).toBe(-5900);
  });
  it('credit note GST breakdown reconciles', () => {
    const c = creditNoteFromRefund(590000, 'Tamil Nadu');
    expect(c).toEqual({ taxable: 5000, cgst: 450, sgst: 450, igst: 0, total: 5900 });
    expect(creditNoteFromRefund(590000, 'Kerala').igst).toBe(900);
  });
  it('a refund still under review changes nothing', () => {
    expect(summariseFy(2026, [adv], [cn({ status: 'needs_review' })]).creditTotal).toBe(0);
  });
});

describe('reconcilePlans', () => {
  const pay = (over: Partial<PaymentRow> = {}): PaymentRow => ({ id: 'pay1', plan_id: 'p', kind: 'advance', status: 'paid', amount_minor: 1770000, payment_id: 'pay_X', invoice_id: 'YAFT-1', invoice_no: 'YAFT-1', sync_status: 'ok', ...over });
  const inv = bill('YAFT-1', '20/03/2026', 15000, { course_payment_id: 'pay1' });

  it('is clean when payment and bill agree', () => { expect(reconcilePlans([pay()], [inv], [])).toEqual([]); });
  it('flags a paid instalment with no bill', () => {
    expect(reconcilePlans([pay()], [], []).map((m) => m.message)).toEqual(['Paid advance has no bill. Use Retry.']);
  });
  it('flags a duplicate bill', () => {
    const dup = { ...inv, id: 'YAFT-2', invoice_no: 'YAFT-2' };
    expect(reconcilePlans([pay()], [inv, dup], []).some((m) => m.message.includes('duplicate'))).toBe(true);
  });
  it('flags an amount difference', () => {
    expect(reconcilePlans([pay({ amount_minor: 1770100 })], [inv], []).some((m) => m.message.includes('differs'))).toBe(true);
  });
  it('flags a plan paid in full and in instalments', () => {
    const full = pay({ id: 'pay9', kind: 'full', amount_minor: 3540000, payment_id: 'pay_F' });
    expect(reconcilePlans([pay(), full], [inv, bill('YAFT-9', '21/03/2026', 30000, { course_payment_id: 'pay9' }) as never], []).some((m) => m.message.includes('AND in instalments'))).toBe(true);
  });
  it('flags failed sync and unreviewed refunds', () => {
    const m = reconcilePlans([pay({ sync_status: 'failed' })], [inv], [{ id: 'r1', payment_row_id: 'pay1', invoice_id: 'YAFT-1', refund_minor: 590000, status: 'needs_review', total: null }]);
    expect(m.length).toBe(2);
  });
});
