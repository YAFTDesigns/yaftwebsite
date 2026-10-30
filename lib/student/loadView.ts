import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeInvoiceTotals, type InvoiceLineItem } from '@/lib/invoiceMath';
import { buildEnrolmentCard, type EnrolmentCard, type PlanRow } from './enrolmentView';
import { emailCandidates, type Candidate } from './claims';
import type { PlanKind } from '@/lib/coursePayments';
import { loadProjects, type ProjectView } from './projects';
import { certificateEligibility } from './certificateEligibility';

export type BillRow = { invoiceId: string; invoiceNo: string; date: string; taxable: number; gst: number; total: number; kind: 'bill' };
export type CreditNoteRow = { creditNoteNo: string; date: string | null; total: number | null };
export type PaymentRow = { kind: PlanKind; paidAt: string | null; amountInr: number };
export type EnrolmentView = EnrolmentCard & { payUrl: string; bills: BillRow[]; payments: PaymentRow[]; creditNotes: CreditNoteRow[]; isTest: boolean };
export type CertView = { certificateId: string; courseTitle: string; issuedOn: string; planId: string; courseSlug: string; verifyToken: string | null };
export type CertStatus = { planId: string; courseSlug: string; eligible: boolean; missing: string[] };
export type PortalView = { enrolments: EnrolmentView[]; candidates: Candidate[]; totals: { courses: number; outstandingInr: number; certificates: number }; projects: ProjectView[]; certificates: CertView[]; certStatus: CertStatus[] };

/** Everything the dashboard shows, read from EXISTING records and scoped to this student's linked plans only. */
export async function loadPortalView(student: { id: string; email: string }): Promise<PortalView> {
  const admin = getSupabaseAdmin();
  const { data: links } = await admin.from('student_enrolments').select('plan_id').eq('student_id', student.id);
  const planIds = (links ?? []).map((l) => l.plan_id as string);
  const candidates = await emailCandidates(student.email);
  if (!planIds.length) return { enrolments: [], candidates, totals: { courses: 0, outstandingInr: 0, certificates: 0 }, projects: [], certificates: [], certStatus: [] };

  const [plans, pays, invs, adj] = await Promise.all([
    admin.from('course_payment_plans').select('id, token, status, description, course_slugs, currency, is_test, structure, base_total, advance_base').in('id', planIds),
    admin.from('course_payments').select('plan_id, kind, status, paid_at, amount_minor').in('plan_id', planIds).eq('status', 'paid'),
    admin.from('invoices').select('id, invoice_no, date, items, client_state, course_plan_id').in('course_plan_id', planIds),
    admin.from('invoice_adjustments').select('plan_id, credit_note_no, issued_date, total').in('plan_id', planIds).eq('status', 'issued'),
  ]);

  const enrolments: EnrolmentView[] = (plans.data ?? []).map((p) => {
    const mine = (pays.data ?? []).filter((x) => x.plan_id === p.id);
    const card = buildEnrolmentCard(p as unknown as PlanRow, mine.map((x) => x.kind as PlanKind));
    const bills: BillRow[] = (invs.data ?? []).filter((i) => i.course_plan_id === p.id).map((i) => {
      const t = computeInvoiceTotals((i.items ?? []) as InvoiceLineItem[], i.client_state || '');
      const gst = Math.round((t.cgst + t.sgst + t.igst) * 100) / 100;
      return { invoiceId: i.id, invoiceNo: i.invoice_no, date: i.date, taxable: Math.round(t.subtotal * 100) / 100, gst, total: Math.round(t.total * 100) / 100, kind: 'bill' as const };
    });
    return {
      ...card,
      payUrl: `/pay/${p.token}`,
      bills,
      payments: mine.map((x) => ({ kind: x.kind as PlanKind, paidAt: x.paid_at, amountInr: Math.round(Number(x.amount_minor)) / 100 })),
      creditNotes: (adj.data ?? []).filter((a) => a.plan_id === p.id).map((a) => ({ creditNoteNo: a.credit_note_no, date: a.issued_date, total: a.total === null ? null : Number(a.total) })),
      isTest: !!p.is_test,
    };
  });
  const live = enrolments.filter((e) => e.payStatus !== 'cancelled');
  const [projects, certs, rules] = await Promise.all([
    loadProjects(student.id),
    admin.from('certificates').select('certificate_id, course_title, course_suffix, issue_date, plan_id, course_slug, verify_token').eq('student_id', student.id).eq('revoked', false),
    admin.from('course_rules').select('course_slug, requires_full_payment'),
  ]);
  const certificates: CertView[] = (certs.data ?? []).map((c) => ({ certificateId: c.certificate_id, courseTitle: c.course_title || c.course_suffix, issuedOn: c.issue_date, planId: c.plan_id, courseSlug: c.course_slug, verifyToken: c.verify_token }));
  const certStatus: CertStatus[] = live.flatMap((e) => e.courseSlugs.map((slug) => {
    const pr = projects.find((p) => p.planId === e.planId && p.courseSlug === slug);
    const needFull = (rules.data ?? []).find((r) => r.course_slug === slug)?.requires_full_payment ?? true;
    const has = certificates.some((c) => c.planId === e.planId && c.courseSlug === slug);
    const el = certificateEligibility({ projectState: pr?.hasApproved ? 'approved' : (pr?.status ?? 'none'), payStatus: e.payStatus, requiresFullPayment: needFull, hasLiveCertificate: has });
    return { planId: e.planId, courseSlug: slug, eligible: el.eligible, missing: el.missing };
  }));
  return { enrolments, candidates, totals: { courses: live.length, outstandingInr: Math.round(live.reduce((a, e) => a + e.balanceInr, 0) * 100) / 100, certificates: certificates.length }, projects, certificates, certStatus };
}
