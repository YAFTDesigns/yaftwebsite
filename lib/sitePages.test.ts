import { describe, it, expect } from 'vitest';
import { dedupeToTopLevelPages, labelFor } from './sitePages';

const BASE = 'https://www.yaftdesigns.com';

// This file exists specifically to protect against the bug Yokes
// found: the site status check used to be a hardcoded page list that
// silently drifted out of sync with what pages actually existed
// (Labs and Insights went completely unmonitored). The fix was
// deriving the checked pages from the real sitemap instead. These
// tests are what would catch it if someone later "simplifies" this
// back into a hardcoded allowlist -- the critical one is the last
// test below: a brand-new, unknown section must still show up, not
// be silently dropped.

describe('dedupeToTopLevelPages', () => {
  it('collapses multiple sub-pages under one top-level section into a single entry', () => {
    const entries = [
      { url: `${BASE}/courses` },
      { url: `${BASE}/courses/rhino3d-architecture` },
      { url: `${BASE}/courses/grasshopper-architecture` },
      { url: `${BASE}/insights` },
      { url: `${BASE}/insights/some-post` },
      { url: `${BASE}/insights/another-post` },
    ];
    const pages = dedupeToTopLevelPages(entries, BASE);
    expect(pages).toEqual([
      { name: 'Courses', path: '/courses' },
      { name: 'Insights', path: '/insights' },
    ]);
  });

  it('handles the root URL as "/" rather than an empty or malformed path', () => {
    const pages = dedupeToTopLevelPages([{ url: BASE }], BASE);
    expect(pages).toEqual([{ name: 'Home', path: '/' }]);
  });

  it('mirrors the real sitemap shape end-to-end (root, courses x2, projects x2, insights x2)', () => {
    const entries = [
      { url: `${BASE}` },
      { url: `${BASE}/courses` },
      { url: `${BASE}/courses/rhino3d-architecture` },
      { url: `${BASE}/projects` },
      { url: `${BASE}/projects/some-project-slug` },
      { url: `${BASE}/projects/another-project-slug` },
      { url: `${BASE}/insights` },
      { url: `${BASE}/insights/a-post` },
      { url: `${BASE}/labs` },
    ];
    const pages = dedupeToTopLevelPages(entries, BASE);
    expect(pages.map(p => p.path)).toEqual(['/', '/courses', '/projects', '/insights', '/labs']);
  });

  it('never drops a brand-new, unrecognized top-level section -- this is the actual regression guard', () => {
    // A hypothetical future section this code has never seen before.
    // If this ever starts failing, it means someone reintroduced a
    // hardcoded allowlist that silently drops anything not on it --
    // exactly the class of bug this whole file exists to catch.
    const entries = [{ url: `${BASE}/gallery` }, { url: `${BASE}/gallery/some-item` }];
    const pages = dedupeToTopLevelPages(entries, BASE);
    expect(pages).toEqual([{ name: 'Gallery', path: '/gallery' }]);
  });
});

describe('labelFor', () => {
  it('uses the known, human-written label for established sections', () => {
    expect(labelFor('/courses')).toBe('Courses');
    expect(labelFor('/labs')).toBe('Labs');
    expect(labelFor('/')).toBe('Home');
  });

  it('derives a reasonable capitalized label for an unknown path', () => {
    expect(labelFor('/workshops')).toBe('Workshops');
    expect(labelFor('/gallery')).toBe('Gallery');
  });
});
