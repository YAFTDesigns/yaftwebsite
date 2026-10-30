import { describe, it, expect } from 'vitest';
import { usdMinorFor, parseFrankfurter, parseErApi } from './fx';

describe('usdMinorFor', () => {
  it('converts, adds the buffer and rounds up to a whole dollar', () => {
    expect(usdMinorFor(35400, 83, 2)).toBe(43600);  // 35400/83 = 426.5; +2% = 435.0..; ceil = $436
    expect(usdMinorFor(35400, 83, 0)).toBe(42700);  // 426.5 -> $427
  });
  it('an exact dollar stays put', () => { expect(usdMinorFor(8300, 83, 0)).toBe(10000); });
  it('moves with the rate', () => { expect(usdMinorFor(35400, 90, 0)).toBeLessThan(usdMinorFor(35400, 80, 0)); });
  it('rejects nonsense', () => { expect(() => usdMinorFor(0, 83, 2)).toThrow(); expect(() => usdMinorFor(100, 0, 2)).toThrow(); });
});

describe('rate parsers', () => {
  it('reads Frankfurter', () => { expect(parseFrankfurter({ base: 'USD', rates: { INR: 83.4 } })).toBe(83.4); });
  it('reads er-api only on success', () => {
    expect(parseErApi({ result: 'success', rates: { INR: 83.4 } })).toBe(83.4);
    expect(parseErApi({ result: 'error' })).toBeNull();
  });
  it('rejects absurd or missing rates so a bad feed can never price a course', () => {
    expect(parseFrankfurter({ rates: { INR: 0.8 } })).toBeNull();
    expect(parseFrankfurter({ rates: { INR: 8300 } })).toBeNull();
    expect(parseFrankfurter({ rates: {} })).toBeNull();
    expect(parseFrankfurter(null)).toBeNull();
    expect(parseFrankfurter({ rates: { INR: '83' } })).toBeNull();
  });
});
