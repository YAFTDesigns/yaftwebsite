import { scheduleFor, nextDue, type PlanKind, type PlanShape } from '@/lib/coursePayments';

// Builds one "My Courses" card from EXISTING records. It never recomputes a price: amounts come from scheduleFor(),
// the same function the pay page and checkout use, and "paid" comes from course_payments rows with status 'paid'.

export type PlanRow = PlanShape & { id: string; status: 'active' | 'complete' | 'cancelled'; description: string; course_slugs: string[] | null; currency: 'INR' | 'USD'; is_test: boolean };
export type PayStatus = 'unpaid' | 'advance_paid' | 'paid_in_full' | 'cancelled';
export type NextAction = 'pay_advance' | 'pay_balance' | 'pay_full' | null;

export type EnrolmentCard = {
  planId: string;
  title: string;
  courseSlugs: string[];
  currency: 'INR' | 'USD';
  totalInr: number;      // incl. GST, rupees
  paidInr: number;
  balanceInr: number;
  payStatus: PayStatus;
  nextAction: NextAction;
  allocationAmbiguous: boolean;   // a combo plan: payments belong to the whole plan, never split per course
};

export function buildEnrolmentCard(plan: PlanRow, paidKinds: PlanKind[]): EnrolmentCard {
  const s = scheduleFor(plan);
  const paid = new Set(paidKinds);
  let paidInr = 0;
  if (paid.has('full')) paidInr = s.total.total;
  else {
    if (paid.has('advance') && s.advance) paidInr += s.advance.total;
    if (paid.has('balance') && s.balance) paidInr += s.balance.total;
  }
  paidInr = Math.round(paidInr * 100) / 100;
  const balanceInr = Math.max(0, Math.round((s.total.total - paidInr) * 100) / 100);
  const slugs = plan.course_slugs ?? [];
  const settled = paid.has('full') || (paid.has('advance') && paid.has('balance'));
  const payStatus: PayStatus = plan.status === 'cancelled' ? 'cancelled' : settled ? 'paid_in_full' : paid.size > 0 ? 'advance_paid' : 'unpaid';
  const due = plan.status === 'active' ? nextDue({ structure: plan.structure, paid }) : null;
  const nextAction: NextAction = due === 'advance' ? 'pay_advance' : due === 'balance' ? 'pay_balance' : due === 'full' ? 'pay_full' : null;
  return { planId: plan.id, title: plan.description, courseSlugs: slugs, currency: plan.currency, totalInr: s.total.total, paidInr, balanceInr, payStatus, nextAction, allocationAmbiguous: slugs.length > 1 };
}
