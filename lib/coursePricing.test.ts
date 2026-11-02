import { describe, it, expect } from 'vitest';
import { usdApprox, fmtInr, FALLBACK_FEES, PAYMENT_NOTE } from './coursePricing';

describe('coursePricing', () => {
  it('keeps the long-standing USD approximations', () => {
    expect(usdApprox(25000)).toBe(300);
    expect(usdApprox(30000)).toBe(360);
    expect(usdApprox(10000)).toBe(120);
    expect(usdApprox(60000)).toBe(720);
  });
  it('formats rupees the Indian way', () => { expect(fmtInr(25000)).toBe('25,000'); expect(fmtInr(100000)).toBe('1,00,000'); });
  it('has a fallback fee for every course page', () => { expect(Object.keys(FALLBACK_FEES)).toHaveLength(6); });
  it('payment note leads with online checkout, not NEFT', () => { expect(PAYMENT_NOTE.indexOf('Razorpay')).toBeLessThan(PAYMENT_NOTE.indexOf('NEFT')); expect(PAYMENT_NOTE).not.toMatch(/IFSC|Axis/); });
});
