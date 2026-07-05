import { describe, it, expect } from 'vitest';
import { computeInvoiceTotals, getTaxMode } from './invoiceMath';

describe('getTaxMode', () => {
  it('treats Tamil Nadu as intra-state', () => {
    expect(getTaxMode('Tamil Nadu')).toBe('intra');
  });

  it('is case-insensitive', () => {
    expect(getTaxMode('TAMIL NADU')).toBe('intra');
    expect(getTaxMode('tamil nadu')).toBe('intra');
  });

  it.each(['Australia', 'Singapore', 'UAE', 'Oman', 'International'])(
    'treats %s as international (no GST)',
    (state) => {
      expect(getTaxMode(state)).toBe('intl');
    }
  );

  it('treats any other Indian state as interstate', () => {
    expect(getTaxMode('Karnataka')).toBe('interstate');
    expect(getTaxMode('Maharashtra')).toBe('interstate');
    expect(getTaxMode('Delhi')).toBe('interstate');
  });

  it('falls back to interstate for empty/unknown input rather than throwing', () => {
    expect(getTaxMode('')).toBe('interstate');
    // @ts-expect-error deliberately testing bad input from an untyped caller
    expect(getTaxMode(undefined)).toBe('interstate');
  });
});

describe('computeInvoiceTotals', () => {
  const oneItem = [{ desc: 'Rhino3D for Architecture', hrs: 10, qty: 1, rate: 10000 }];

  it('applies CGST 9% + SGST 9% for Tamil Nadu, no IGST', () => {
    const result = computeInvoiceTotals(oneItem, 'Tamil Nadu');
    expect(result.subtotal).toBe(10000);
    expect(result.cgst).toBe(900);
    expect(result.sgst).toBe(900);
    expect(result.igst).toBe(0);
    expect(result.total).toBe(11800);
    expect(result.taxMode).toBe('intra');
  });

  it('applies IGST 18% for other Indian states, no CGST/SGST', () => {
    const result = computeInvoiceTotals(oneItem, 'Karnataka');
    expect(result.subtotal).toBe(10000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(1800);
    expect(result.total).toBe(11800);
    expect(result.taxMode).toBe('interstate');
  });

  it('applies no tax at all for international clients', () => {
    const result = computeInvoiceTotals(oneItem, 'Singapore');
    expect(result.subtotal).toBe(10000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(0);
    expect(result.total).toBe(10000);
    expect(result.taxMode).toBe('intl');
  });

  it('sums multiple line items before applying tax', () => {
    const items = [
      { desc: 'Workshop', hrs: 6, qty: 1, rate: 15000 },
      { desc: 'Consulting', hrs: 4, qty: 2, rate: 5000 },
    ];
    // subtotal = 15000 + (2 * 5000) = 25000
    const result = computeInvoiceTotals(items, 'Tamil Nadu');
    expect(result.subtotal).toBe(25000);
    expect(result.cgst).toBe(2250);
    expect(result.sgst).toBe(2250);
    expect(result.total).toBe(29500);
  });

  it('handles a zero-rate or zero-qty item without throwing or producing NaN', () => {
    const items = [
      { desc: 'Complimentary session', hrs: 1, qty: 1, rate: 0 },
      { desc: 'Paid session', hrs: 1, qty: 0, rate: 5000 },
    ];
    const result = computeInvoiceTotals(items, 'Tamil Nadu');
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
    expect(Number.isNaN(result.total)).toBe(false);
  });

  it('handles an empty items array', () => {
    const result = computeInvoiceTotals([], 'Tamil Nadu');
    expect(result.subtotal).toBe(0);
    expect(result.total).toBe(0);
  });

  it('is not thrown off by decimal quantities (e.g. half-day rates)', () => {
    const items = [{ desc: 'Half day', hrs: 4, qty: 0.5, rate: 10000 }];
    const result = computeInvoiceTotals(items, 'Tamil Nadu');
    expect(result.subtotal).toBe(5000);
    expect(result.total).toBe(5900);
  });

  it('never produces a negative total for valid positive inputs', () => {
    const result = computeInvoiceTotals(oneItem, 'Tamil Nadu');
    expect(result.total).toBeGreaterThan(0);
  });
});
