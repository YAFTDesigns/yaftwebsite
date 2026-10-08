import { describe, expect, it } from 'vitest';
import { addMonths, newLicenseKey, normalizeKey } from './tortoiseLicense';

describe('tortoiseLicense', () => {
  it('makes readable unique keys', () => {
    const a = newLicenseKey();
    expect(a).toMatch(/^TORT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(newLicenseKey()).not.toBe(a);
  });
  it('normalizes pasted keys', () => {
    expect(normalizeKey('  tort-abcd-efgh-jkmn \n')).toBe('TORT-ABCD-EFGH-JKMN');
    expect(normalizeKey(undefined)).toBe('');
  });
  it('adds months without mutating', () => {
    const d = new Date('2026-01-15T00:00:00Z');
    expect(addMonths(d, 12).toISOString()).toBe('2027-01-15T00:00:00.000Z');
    expect(d.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});
