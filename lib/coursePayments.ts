// Pure maths for a two-instalment course payment. Whole rupees in, paise out, so nothing drifts.
export const GST_PERCENT = 18;

export type Instalment = { base: number; gst: number; total: number }; // rupees
export type Schedule = { advance: Instalment; balance: Instalment; total: Instalment };

const gstOn = (base: number) => Math.round(base * GST_PERCENT) / 100;

/** Splits a course fee into advance + balance, GST on each. Throws on bad input. */
export function computeSchedule(baseTotal: number, advanceBase: number): Schedule {
  if (!Number.isInteger(baseTotal) || !Number.isInteger(advanceBase)) throw new Error('Amounts must be whole rupees');
  if (advanceBase < 1 || advanceBase >= baseTotal) throw new Error('Advance must be more than 0 and less than the full fee');
  const mk = (base: number): Instalment => ({ base, gst: gstOn(base), total: base + gstOn(base) });
  const total = mk(baseTotal);
  const advance = mk(advanceBase);
  const balanceBase = baseTotal - advanceBase;
  // Balance is the exact remainder, so the two instalments always add up to the invoice total.
  const balance: Instalment = { base: balanceBase, gst: Math.round((total.gst - advance.gst) * 100) / 100, total: Math.round((total.total - advance.total) * 100) / 100 };
  return { advance, balance, total };
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);

export type PlanProgress = { advancePaid: boolean; balancePaid: boolean };

/** Which instalment is due next, or null when nothing is due (complete). */
export function nextDue(p: PlanProgress): 'advance' | 'balance' | null {
  if (!p.advancePaid) return 'advance';
  if (!p.balancePaid) return 'balance';
  return null;
}
