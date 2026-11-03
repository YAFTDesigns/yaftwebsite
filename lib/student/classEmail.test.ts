import { describe, it, expect } from 'vitest';
import { paymentClassBodyHtml } from './classEmail';

describe('paymentClassBodyHtml', () => {
  it('tells the student to check the portal and the spam/promotions folders, with or without a class booked', () => {
    for (const next of [null, { title: 'Class 1', when: 'Wednesday, 04 November, 08:00 am' }]) {
      const h = paymentClassBodyHtml('Rhino3D Training', next);
      expect(h).toContain('payment for <strong>Rhino3D Training</strong> is confirmed');
      expect(h).toMatch(/student portal/);
      expect(h).toMatch(/Spam/);
      expect(h).toMatch(/Promotions/);
      expect(h).not.toMatch(/meet\.google|zoom\.us/);
    }
  });
  it('asks the student to wait when no class exists yet, and escapes the description', () => {
    expect(paymentClassBodyHtml('A <b>', null)).toMatch(/Please wait for it/);
    expect(paymentClassBodyHtml('A <b>', null)).toContain('A &lt;b&gt;');
  });
});
