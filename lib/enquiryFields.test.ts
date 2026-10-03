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

import { audienceToSegment, defaultFunnel, normalizeAudience, normalizeFunnel, cleanText, AUDIENCES, FUNNELS } from './enquiryFields';
import { FUNNEL_CONFIG } from './funnels';

describe('audience and funnel', () => {
  it('maps audience to the coarse segment and default funnel', () => {
    expect(audienceToSegment('student')).toBe('individual');
    expect(audienceToSegment('professional')).toBe('individual');
    expect(audienceToSegment('college')).toBe('college');
    expect(audienceToSegment('company')).toBe('corporate');
    expect(defaultFunnel('company')).toBe('corporate');
    expect(defaultFunnel('student')).toBe('individual');
  });
  it('validates audience and funnel, blank allowed', () => {
    expect(normalizeAudience('student')).toEqual({ ok: true, value: 'student' });
    expect(normalizeAudience('')).toEqual({ ok: true, value: null });
    expect(normalizeAudience('teacher')).toEqual({ ok: false });
    expect(normalizeFunnel('consulting')).toEqual({ ok: true, value: 'consulting' });
    expect(normalizeFunnel('x')).toEqual({ ok: false });
  });
  it('cleanText trims, collapses and caps', () => {
    expect(cleanText('  a   b ', 10)).toBe('a b');
    expect(cleanText('abcdef', 3)).toBe('abc');
    expect(cleanText('   ', 5)).toBeNull();
    expect(cleanText(5, 5)).toBeNull();
  });
  it('every funnel has a page config with unique path and valid cross links', () => {
    const paths = new Set<string>();
    for (const f of FUNNELS) {
      const c = FUNNEL_CONFIG[f];
      expect(c.key).toBe(f);
      expect(c.options.length).toBeGreaterThan(1);
      expect(paths.has(c.path)).toBe(false);
      paths.add(c.path);
      c.crossLinks.forEach((k) => expect(FUNNELS).toContain(k));
    }
    expect(AUDIENCES.length).toBe(4);
  });
});

import { cleanDetails } from './enquiryFields';
describe('cleanDetails', () => {
  it('keeps only whitelisted keys, trimmed and capped', () => {
    expect(cleanDetails({ role: ' HOD ', participants: '40', evil: 'x', city: 'a'.repeat(300) })).toEqual({ role: 'HOD', participants: '40', city: 'a'.repeat(120) });
  });
  it('returns null for nothing useful', () => {
    expect(cleanDetails({})).toBeNull();
    expect(cleanDetails({ role: '   ' })).toBeNull();
    expect(cleanDetails('x')).toBeNull();
    expect(cleanDetails([1])).toBeNull();
    expect(cleanDetails(null)).toBeNull();
  });
});
