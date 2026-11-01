import { describe, it, expect } from 'vitest';
import { parseBillNo, coursesInBill } from './legacyBill';
import { buildEnrolmentCard } from './enrolmentView';

describe('parseBillNo', () => {
  it('accepts real bill numbers in any case with stray spaces', () => {
    expect(parseBillNo(' yaft-102026-21 ')).toBe('YAFT-102026-21');
    expect(parseBillNo('YAFT-082026-9')).toBe('YAFT-082026-9');
  });
  it('rejects test, proforma and junk', () => {
    for (const v of ['YAFT-TEST-6CJYYCK9', 'YAFT-PF-082026-20', 'TOR-102026-01', '', 'x', 42, null]) expect(parseBillNo(v)).toBeNull();
  });
});

describe('legacy plan card', () => {
  const plan = { id: 'p', status: 'complete' as const, description: 'Rhino3D for Architecture', course_slugs: ['rhino-architecture'], currency: 'INR' as const, is_test: false, structure: 'full' as const, base_total: 25000, advance_base: null, source: 'legacy' };
  it('counts as paid in full with nothing left to pay', () => {
    const c = buildEnrolmentCard(plan, []);
    expect(c.payStatus).toBe('paid_in_full');
    expect(c.balanceInr).toBe(0);
    expect(c.nextAction).toBeNull();
  });
  it('a normal plan with no payments is still unpaid', () => {
    expect(buildEnrolmentCard({ ...plan, source: 'enroll', status: 'active' }, []).payStatus).toBe('unpaid');
  });
});

describe('coursesInBill', () => {
  it('reads real bill wording', () => {
    expect(coursesInBill([{ desc: 'Rhino3D for Architecture' }, { desc: 'Grasshopper for Computational Design' }]).sort()).toEqual(['grasshopper-architecture', 'rhino-architecture']);
    expect(coursesInBill([{ desc: 'Wearables & Product Design' }])).toEqual(['rhino-wearables-footwear']);
    expect(coursesInBill([{ desc: 'Rhino3D for AEC & Climate' }])).toEqual(['rhino-aec-climate']);
  });
  it('returns nothing for wording it does not know', () => {
    expect(coursesInBill([{ desc: 'Consulting' }])).toEqual([]);
    expect(coursesInBill(null)).toEqual([]);
  });
});
