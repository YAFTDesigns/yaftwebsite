import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from './razorpay';
import { priceFor } from './tortoisePricing';

describe('verifyWebhookSignature', () => {
  const body = '{"event":"payment.captured"}';
  const secret = 'test-secret';
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  it('accepts a valid signature', () => expect(verifyWebhookSignature(body, sig, secret)).toBe(true));
  it('rejects a tampered body', () => expect(verifyWebhookSignature(body + ' ', sig, secret)).toBe(false));
  it('rejects a wrong secret', () => expect(verifyWebhookSignature(body, sig, 'other')).toBe(false));
  it('rejects missing signature or secret', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, sig, '')).toBe(false);
  });
});

describe('priceFor', () => {
  it('USD has no GST', () => expect(priceFor('USD', 2)).toEqual({ currency: 'USD', quantity: 2, base: 9800, gst: 0, total: 9800 }));
  it('INR adds 18% GST', () => {
    const p = priceFor('INR', 1);
    expect(p.base).toBe(410000);
    expect(p.gst).toBe(73800);
    expect(p.total).toBe(483800);
  });
  it('rejects bad quantity', () => {
    expect(() => priceFor('INR', 0)).toThrow();
    expect(() => priceFor('INR', 11)).toThrow();
  });
});

describe('Tortoise invoice maths matches what Razorpay charges', () => {
  it.each(['Tamil Nadu', 'Karnataka'])('INR x3 in %s', async (state) => {
    const { computeInvoiceTotals } = await import('./invoiceMath');
    const p = priceFor('INR', 3);
    const t = computeInvoiceTotals([{ qty: 3, rate: p.base / 3 / 100 }], state);
    expect(Math.round(t.total * 100)).toBe(p.total);
    if (state === 'Tamil Nadu') { expect(t.cgst).toBe(t.sgst); expect(t.igst).toBe(0); }
    else expect(t.igst).toBeGreaterThan(0);
  });
});
