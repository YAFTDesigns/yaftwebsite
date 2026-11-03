import { describe, it, expect } from 'vitest';
import { buildRegFunnel } from './registrationFunnel';

const now = new Date('2026-11-03T10:00:00Z');
describe('buildRegFunnel', () => {
  it('counts registered, checkout, paid, fully paid; ignores test plans/payments', () => {
    const f = buildRegFunnel({
      students: [1, 2, 3, 4].map((n) => ({ id: 's' + n, created_at: '2026-10-10T00:00:00Z' })),
      links: [{ student_id: 's2', plan_id: 'p2' }, { student_id: 's3', plan_id: 'p3' }, { student_id: 's4', plan_id: 'pt' }],
      plans: [{ id: 'p2', is_test: false }, { id: 'p3', is_test: false }, { id: 'pt', is_test: true }],
      payments: [
        { plan_id: 'p3', kind: 'advance', paid_at: '2026-10-12T00:00:00Z', test_mode: false },
        { plan_id: 'p3', kind: 'balance', paid_at: '2026-10-20T00:00:00Z', test_mode: false },
        { plan_id: 'pt', kind: 'full', paid_at: '2026-10-12T00:00:00Z', test_mode: false },
      ],
    }, 6, now);
    expect([f.registered, f.startedCheckout, f.paid, f.fullyPaid]).toEqual([4, 2, 1, 1]);
    expect(f.months.find((m) => m.key === '2026-10')).toEqual({ key: '2026-10', registered: 4, buyers: 1 });
  });
});
