import { describe, it, expect } from 'vitest';
import { pickReusablePlan, type CandidatePlan, type WantedPlan } from './reusablePlan';

const w: WantedPlan = { courseSlugs: ['rhino-architecture'], baseTotal: 25000, advanceBase: 12500, structure: 'instalments', currency: 'INR', isTest: false };
const p = (o: Partial<CandidatePlan> = {}): CandidatePlan => ({ id: 'a', status: 'active', source: 'enroll', is_test: false, currency: 'INR', structure: 'instalments', base_total: 25000, advance_base: 12500, course_slugs: ['rhino-architecture'], created_at: '2026-11-03T02:55:00Z', ...o });

describe('pickReusablePlan', () => {
  it('reuses an open unpaid plan for the same course and fee', () => { expect(pickReusablePlan([p()], new Set(), w)?.id).toBe('a'); });
  it('never reuses a plan that has a payment', () => { expect(pickReusablePlan([p()], new Set(['a']), w)).toBeNull(); });
  it('does not reuse cancelled, different-fee, different-course, other-currency or admin-made plans', () => {
    expect(pickReusablePlan([p({ status: 'cancelled' })], new Set(), w)).toBeNull();
    expect(pickReusablePlan([p({ base_total: 30000 })], new Set(), w)).toBeNull();
    expect(pickReusablePlan([p({ course_slugs: ['grasshopper-architecture'] })], new Set(), w)).toBeNull();
    expect(pickReusablePlan([p({ currency: 'USD' })], new Set(), w)).toBeNull();
    expect(pickReusablePlan([p({ source: 'admin' })], new Set(), w)).toBeNull();
    expect(pickReusablePlan([p({ is_test: true })], new Set(), w)).toBeNull();
  });
  it('takes the newest when several qualify, and matches combos regardless of order', () => {
    const combo: WantedPlan = { ...w, courseSlugs: ['b', 'a'], baseTotal: 40000, advanceBase: 20000 };
    const old = p({ id: 'old', course_slugs: ['a', 'b'], base_total: 40000, advance_base: 20000, created_at: '2026-11-01T00:00:00Z' });
    expect(pickReusablePlan([old, { ...old, id: 'new', created_at: '2026-11-02T00:00:00Z' }], new Set(), combo)?.id).toBe('new');
  });
});
