import { describe, it, expect } from 'vitest';
import { deriveInterestOptions, COURSE_INTEREST_OPTIONS, COURSE_NAV_LIST } from './courseNav';

// Protects against the bug Yokes found: the enquiry-form "Interested
// in" dropdown used to be defined separately in 4 different page
// files, and 3 of the 4 had quietly drifted out of sync with each
// other -- Resources was missing 3 of the 6 real courses entirely.
// Fixed once by sharing one array across all 4 pages, but Yokes
// specifically asked for it to stay fixed "even if I add courses" --
// a shared-but-still-hand-maintained list would have the exact same
// problem again the next time a course gets added and this array
// isn't updated to match. These tests are what would catch that.

describe('deriveInterestOptions', () => {
  it('produces one option per course plus the non-course options, in order', () => {
    const courses = [{ enquiryLabel: 'Course A' }, { enquiryLabel: 'Course B' }];
    const result = deriveInterestOptions(courses, ['Workshop', 'Consulting']);
    expect(result).toEqual(['Course A', 'Course B', 'Workshop', 'Consulting']);
  });

  it('never drops a brand-new course -- this is the actual regression guard', () => {
    // A hypothetical future course this code has never seen before,
    // exactly the "even if I add courses" case Yokes asked to be
    // protected against. If this ever fails, it means the derivation
    // went back to a hardcoded list that doesn't pick up new entries
    // automatically.
    const courses = [
      { enquiryLabel: 'Rhino3D for Architecture' },
      { enquiryLabel: 'A Brand New Course That Does Not Exist Yet' },
    ];
    const result = deriveInterestOptions(courses, []);
    expect(result).toContain('A Brand New Course That Does Not Exist Yet');
  });

  it('handles an empty course list without erroring', () => {
    expect(deriveInterestOptions([], ['Workshop'])).toEqual(['Workshop']);
  });
});

describe('COURSE_INTEREST_OPTIONS (the real, live export)', () => {
  it('has exactly one entry per real course in COURSE_NAV_LIST, plus the non-course options', () => {
    // Directly ties the live export back to the live course list --
    // if a course is ever added to COURSE_NAV_LIST without updating
    // this test's expectation, this fails loudly rather than the gap
    // sitting unnoticed the way it did before.
    const courseLabels = COURSE_NAV_LIST.map((c) => c.enquiryLabel);
    expect(COURSE_INTEREST_OPTIONS.slice(0, courseLabels.length)).toEqual(courseLabels);
    expect(COURSE_INTEREST_OPTIONS.length).toBe(COURSE_NAV_LIST.length + 2); // + Institutional workshop, Consulting project
  });

  it('includes the current real Wearables course -- the specific case that prompted this fix', () => {
    expect(COURSE_INTEREST_OPTIONS).toContain('Wearables & Product Design');
  });
});
