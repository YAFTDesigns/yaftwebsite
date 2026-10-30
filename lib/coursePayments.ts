// Pure maths for course payment plans. Whole rupees in, paise out, so nothing drifts.
export const GST_PERCENT = 18;

export type Instalment = { base: number; gst: number; total: number }; // rupees
export type PlanKind = 'advance' | 'balance' | 'full';
export type PlanShape = { structure: 'instalments' | 'full'; base_total: number; advance_base: number | null };

const gstOn = (base: number) => Math.round(base * GST_PERCENT) / 100;
const mk = (base: number): Instalment => ({ base, gst: gstOn(base), total: Math.round((base + gstOn(base)) * 100) / 100 });

export type Schedule = { structure: 'instalments' | 'full'; total: Instalment; advance: Instalment | null; balance: Instalment | null; full: Instalment | null };

/** Splits a course fee. Each bill carries its own GST; the bills always add up to the full total. Throws on bad input. */
export function computeSchedule(baseTotal: number, advanceBase: number | null): Schedule {
  if (!Number.isInteger(baseTotal) || baseTotal < 1) throw new Error('Fee must be whole rupees');
  const total = mk(baseTotal);
  if (advanceBase === null) return { structure: 'full', total, advance: null, balance: null, full: total };
  if (!Number.isInteger(advanceBase)) throw new Error('Amounts must be whole rupees');
  if (advanceBase < 1 || advanceBase >= baseTotal) throw new Error('Advance must be more than 0 and less than the full fee');
  // 'full' stays available on an instalment plan: the client may pay everything in one go before paying any advance.
  return { structure: 'instalments', total, advance: mk(advanceBase), balance: mk(baseTotal - advanceBase), full: total };
}

export function scheduleFor(plan: PlanShape): Schedule {
  return computeSchedule(plan.base_total, plan.structure === 'full' ? null : plan.advance_base);
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);

export type PlanProgress = { structure: 'instalments' | 'full'; paid: ReadonlySet<string> | string[] };

/** Which payment is due next, or null when the plan is fully paid. */
export function nextDue(p: PlanProgress): PlanKind | null {
  const paid = new Set(p.paid);
  if (paid.has('full')) return null;
  if (p.structure === 'full') return paid.has('full') ? null : 'full';
  if (!paid.has('advance')) return 'advance';
  if (!paid.has('balance')) return 'balance';
  return null;
}

/**
 * Description line printed on each bill. Every bill is a normal full tax invoice, so the paper never says
 * "advance"; that word is only a label in the pay portal. Two bills for one course are numbered part 1 / part 2.
 */
export function billDescription(base: string, kind: PlanKind): string {
  if (kind === 'advance') return `${base} (part 1 of 2)`;
  if (kind === 'balance') return `${base} (part 2 of 2)`;
  return base;
}
