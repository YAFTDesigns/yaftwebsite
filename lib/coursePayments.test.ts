import { describe, it, expect } from 'vitest';
import { computeSchedule, toPaise, nextDue } from './coursePayments';

describe('computeSchedule', () => {
  it('splits 30,000 / 15,000 with GST on each', () => {
    const s = computeSchedule(30000, 15000);
    expect(s.advance).toEqual({ base: 15000, gst: 2700, total: 17700 });
    expect(s.balance).toEqual({ base: 15000, gst: 2700, total: 17700 });
    expect(s.total).toEqual({ base: 30000, gst: 5400, total: 35400 });
  });
  it('instalments always add up to the total', () => {
    for (const [t, a] of [[30001, 12345], [35000, 1], [99999, 99998], [30000, 10001]]) {
      const s = computeSchedule(t, a);
      expect(toPaise(s.advance.total) + toPaise(s.balance.total)).toBe(toPaise(s.total.total));
    }
  });
  it('rejects bad input', () => {
    expect(() => computeSchedule(30000, 0)).toThrow();
    expect(() => computeSchedule(30000, 30000)).toThrow();
    expect(() => computeSchedule(30000.5, 100)).toThrow();
  });
});

describe('nextDue', () => {
  it('goes advance, balance, done', () => {
    expect(nextDue({ advancePaid: false, balancePaid: false })).toBe('advance');
    expect(nextDue({ advancePaid: true, balancePaid: false })).toBe('balance');
    expect(nextDue({ advancePaid: true, balancePaid: true })).toBeNull();
  });
});
