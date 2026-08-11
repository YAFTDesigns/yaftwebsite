import { describe, it, expect } from 'vitest';
import { ddmmyyyyToIso } from './invoicesExport';
import { monthKey, monthLabel } from './jobsGrouping';

describe('ddmmyyyyToIso', () => {
  // invoices.date is stored as free-text DD/MM/YYYY. Handed directly to
  // new Date(), JS reads that as MM/DD/YYYY -- this is the exact bug the
  // conversion exists to prevent, so these lock in the correct behavior.

  it('converts DD/MM/YYYY to ISO YYYY-MM-DD', () => {
    expect(ddmmyyyyToIso('11/08/2026')).toBe('2026-08-11');
  });

  it('is unambiguous where MM/DD/YYYY parsing would silently disagree', () => {
    // 11/08 is ambiguous (11th Aug vs Nov 8th) -- the real bug case.
    const iso = ddmmyyyyToIso('11/08/2026');
    expect(new Date(iso).getUTCMonth()).toBe(7); // August = month index 7
    expect(new Date(iso).getUTCDate()).toBe(11);
  });

  it('pads single-digit day and month', () => {
    expect(ddmmyyyyToIso('1/7/2026')).toBe('2026-07-01');
  });

  it('correctly sorts across a month boundary once converted', () => {
    // 31/07/2026 (31 July) must sort before 01/08/2026 (1 August).
    // Comparing the raw DD/MM/YYYY strings as text gets this backwards.
    const a = ddmmyyyyToIso('31/07/2026');
    const b = ddmmyyyyToIso('01/08/2026');
    expect(a < b).toBe(true);
  });

  it('passes through already-ISO strings unchanged', () => {
    expect(ddmmyyyyToIso('2026-08-11')).toBe('2026-08-11');
  });

  it('groups invoices from the same real month together via monthKey', () => {
    const day1 = ddmmyyyyToIso('01/08/2026');
    const day31 = ddmmyyyyToIso('31/08/2026');
    expect(monthKey(day1)).toBe(monthKey(day31));
    expect(monthLabel(monthKey(day1))).toBe('Aug 2026');
  });

  it('does not group July 31 and August 1 into the same month', () => {
    const jul31 = ddmmyyyyToIso('31/07/2026');
    const aug1 = ddmmyyyyToIso('01/08/2026');
    expect(monthKey(jul31)).not.toBe(monthKey(aug1));
  });
});
