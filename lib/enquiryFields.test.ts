import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizeSegment } from './enquiryFields';

describe('normalizeSegment', () => {
  it('accepts the three segments and blank', () => {
    expect(normalizeSegment('college')).toEqual({ ok: true, value: 'college' });
    expect(normalizeSegment('')).toEqual({ ok: true, value: null });
    expect(normalizeSegment(undefined)).toEqual({ ok: true, value: null });
  });
  it('rejects anything else', () => {
    expect(normalizeSegment('government')).toEqual({ ok: false });
    expect(normalizeSegment(5)).toEqual({ ok: false });
  });
});

describe('normalizePhone', () => {
  it('is optional', () => {
    expect(normalizePhone('')).toEqual({ ok: true, value: null });
    expect(normalizePhone(undefined)).toEqual({ ok: true, value: null });
    expect(normalizePhone('   ')).toEqual({ ok: true, value: null });
  });
  it('accepts common formats', () => {
    expect(normalizePhone('+91 98765 43210')).toEqual({ ok: true, value: '+91 98765 43210' });
    expect(normalizePhone('9876543210').ok).toBe(true);
    expect(normalizePhone('(0422) 123-4567').ok).toBe(true);
  });
  it('rejects letters, too short and too long', () => {
    expect(normalizePhone('call me').ok).toBe(false);
    expect(normalizePhone('12345').ok).toBe(false);
    expect(normalizePhone('1234567890123456').ok).toBe(false);
    expect(normalizePhone('<script>').ok).toBe(false);
    expect(normalizePhone(12345).ok).toBe(false);
  });
});
