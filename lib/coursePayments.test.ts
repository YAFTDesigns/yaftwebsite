import { describe, it, expect } from 'vitest';
import { computeSchedule, toPaise, nextDue, billDescription } from './coursePayments';

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
      expect(toPaise(s.advance!.total) + toPaise(s.balance!.total)).toBe(toPaise(s.total.total));
    }
  });
  it('rejects bad input', () => {
    expect(() => computeSchedule(30000, 0)).toThrow();
    expect(() => computeSchedule(30000, 30000)).toThrow();
    expect(() => computeSchedule(30000.5, 100)).toThrow();
  });
});

describe('full payment', () => {
  it('has one bill for the whole fee', () => {
    const s = computeSchedule(30000, null);
    expect(s.structure).toBe('full');
    expect(s.full).toEqual({ base: 30000, gst: 5400, total: 35400 });
    expect(s.advance).toBeNull();
  });
});

describe('nextDue', () => {
  it('goes advance, balance, done', () => {
    expect(nextDue({ structure: 'instalments', paid: [] })).toBe('advance');
    expect(nextDue({ structure: 'instalments', paid: ['advance'] })).toBe('balance');
    expect(nextDue({ structure: 'instalments', paid: ['advance', 'balance'] })).toBeNull();
  });
  it('balance is locked until advance is paid', () => {
    expect(nextDue({ structure: 'instalments', paid: ['balance'] })).toBe('advance');
  });
  it('a client on an instalment plan can pay full instead, before any advance', () => {
    expect(nextDue({ structure: 'instalments', paid: ['full'] })).toBeNull();
    expect(computeSchedule(30000, 15000).full).toEqual({ base: 30000, gst: 5400, total: 35400 });
  });
  it('full plan is one payment', () => {
    expect(nextDue({ structure: 'full', paid: [] })).toBe('full');
    expect(nextDue({ structure: 'full', paid: ['full'] })).toBeNull();
  });
});

describe('billDescription', () => {
  it('labels each bill', () => {
    expect(billDescription('Rhino', 'advance')).toBe('Rhino (part 1 of 2)');
    expect(billDescription('Rhino', 'balance')).toBe('Rhino (part 2 of 2)');
    expect(billDescription('Rhino', 'full')).toBe('Rhino');
  });
});
