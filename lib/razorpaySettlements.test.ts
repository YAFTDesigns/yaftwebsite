import { describe, it, expect } from 'vitest';
import { parseReconItems, istDay } from './razorpaySettlements';

describe('parseReconItems', () => {
  it('keeps settled items, converts time, nets credit and debit', () => {
    const r = parseReconItems([
      { entity_id: 'pay_1', type: 'payment', credit: 97100, debit: 0, amount: 100000, fee: 2460, tax: 440, settled: true, settled_at: 1568176960, settlement_id: 'setl_1', settlement_utr: 'UTR1' },
      { entity_id: 'pay_2', type: 'payment', credit: 500, amount: 500, settled: false, settlement_id: 'setl_2' },
      { entity_id: 'pay_3', type: 'payment', credit: 500, amount: 500, settled: true },
      { entity_id: 'rfnd_1', type: 'refund', credit: 0, debit: 1000, amount: 1000, settled: true, settled_at: 1568176960, settlement_id: 'setl_1' },
    ], false);
    expect(r.map((x) => x.entity_id)).toEqual(['pay_1', 'rfnd_1']);
    expect(r[0]).toMatchObject({ credit_minor: 97100, fee_minor: 2460, tax_minor: 440, settlement_utr: 'UTR1', settled_at: '2019-09-11T04:42:40.000Z' });
    expect(r[1].credit_minor).toBe(-1000);
  });
});
describe('istDay', () => {
  it('uses the India date', () => {
    expect(istDay(0, new Date('2026-11-04T20:00:00Z'))).toEqual({ year: 2026, month: 11, day: 5 });
    expect(istDay(1, new Date('2026-11-04T20:00:00Z'))).toEqual({ year: 2026, month: 11, day: 4 });
  });
});
