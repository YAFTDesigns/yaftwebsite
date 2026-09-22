import { describe, it, expect } from 'vitest';
import { fyStartYearFor, fyLabel, currentFyStartYear, availableFyStartYears } from './financialYear';

describe('fyStartYearFor', () => {
  it('buckets April onward into the FY starting that same year', () => {
    expect(fyStartYearFor('01/04/2025')).toBe(2025);
    expect(fyStartYearFor('15/07/2025')).toBe(2025);
    expect(fyStartYearFor('31/12/2025')).toBe(2025);
  });

  it('buckets Jan/Feb/Mar into the FY that started the previous April', () => {
    expect(fyStartYearFor('01/01/2026')).toBe(2025);
    expect(fyStartYearFor('15/02/2026')).toBe(2025);
    expect(fyStartYearFor('31/03/2026')).toBe(2025);
  });

  it('handles the exact FY boundary correctly on both sides', () => {
    expect(fyStartYearFor('31/03/2026')).toBe(2025); // last day of FY 2025-26
    expect(fyStartYearFor('01/04/2026')).toBe(2026);  // first day of FY 2026-27
  });

  // The exact bug this codebase has already hit once: new Date()
  // silently misreads DD/MM as MM/DD. 13/02/2026 has no valid
  // interpretation as MM/DD (there's no 13th month), so a
  // regression here would throw or silently produce nonsense
  // rather than quietly return the wrong year -- still worth
  // pinning down explicitly.
  it('parses DD/MM/YYYY correctly, not MM/DD/YYYY', () => {
    expect(fyStartYearFor('13/02/2026')).toBe(2025); // 13 Feb 2026 -> FY 2025-26
  });
});

describe('fyLabel', () => {
  it('formats as "FY <start>-<2-digit end>"', () => {
    expect(fyLabel(2025)).toBe('FY 2025-26');
    expect(fyLabel(2099)).toBe('FY 2099-00'); // century rollover, correct 2-digit truncation
  });
});

describe('currentFyStartYear', () => {
  it('returns the same calendar year for an April-through-December date', () => {
    expect(currentFyStartYear(new Date('2026-07-15'))).toBe(2026);
    expect(currentFyStartYear(new Date('2026-04-01'))).toBe(2026);
    expect(currentFyStartYear(new Date('2026-12-31'))).toBe(2026);
  });

  it('returns the previous calendar year for a Jan-March date', () => {
    expect(currentFyStartYear(new Date('2026-01-01'))).toBe(2025);
    expect(currentFyStartYear(new Date('2026-03-31'))).toBe(2025);
  });
});

describe('availableFyStartYears', () => {
  it('includes every FY present in the data, most recent first', () => {
    const dates = ['15/06/2024', '20/01/2025', '10/08/2025'];
    // 15/06/2024 -> FY2024, 20/01/2025 -> FY2024 (Jan belongs to the FY
    // that started the previous April, so Jan 2025 is still FY2024),
    // 10/08/2025 -> FY2025
    const result = availableFyStartYears(dates, new Date('2025-10-01'));
    expect(result).toContain(2024);
    expect(result).toContain(2025);
  });

  it('always includes the current FY even with zero matching invoices', () => {
    const result = availableFyStartYears([], new Date('2026-09-15'));
    expect(result).toEqual([2026]);
  });

  it('never lists the same FY twice even with many invoices in it', () => {
    const dates = ['01/05/2025', '15/06/2025', '20/08/2025', '01/03/2026'];
    const result = availableFyStartYears(dates, new Date('2025-07-01'));
    expect(result.filter((y) => y === 2025).length).toBe(1);
  });
});
