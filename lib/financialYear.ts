import { ddmmyyyyToIso } from '@/lib/invoicesExport';

/**
 * Indian financial year: April 1 -> March 31. FY "2025" means
 * 1 Apr 2025 - 31 Mar 2026, displayed as "FY 2025-26".
 *
 * Pure, dependency-free date-bucketing logic, kept separate from the
 * report page itself so it's testable with plain mock dates rather
 * than only exercisable by loading the actual admin page. invoices.date
 * is free-text DD/MM/YYYY (see lib/invoicesExport.ts's own comment on
 * this) -- always goes through ddmmyyyyToIso before any Date parsing,
 * never parsed directly, or DD/MM silently misreads as MM/DD.
 */

export function fyStartYearFor(ddmmyyyy: string): number {
  const iso = ddmmyyyyToIso(ddmmyyyy);
  const [year, month] = iso.split('-').map(Number);
  // Jan/Feb/Mar belong to the FY that started the previous April.
  return month >= 4 ? year : year - 1;
}

export function fyLabel(startYear: number): string {
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function currentFyStartYear(now: Date = new Date()): number {
  const month = now.getMonth() + 1; // 1-12
  return month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Every FY that has at least one row in the given dates, plus the
 * current FY even if it has none yet -- so the selector always offers
 * "this year" as a real option, not just years that already have data. */
export function availableFyStartYears(dates: string[], now: Date = new Date()): number[] {
  const years = new Set(dates.map(fyStartYearFor));
  years.add(currentFyStartYear(now));
  return Array.from(years).sort((a, b) => b - a); // most recent first
}
