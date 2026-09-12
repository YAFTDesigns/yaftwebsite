// Human-readable labels for known top-level sections -- anything not
// listed here still gets checked, just with a name derived from the
// path itself (e.g. a brand-new /gallery section would show as
// "Gallery" automatically, no code change needed).
const KNOWN_LABELS: Record<string, string> = {
  '/': 'Home',
  '/courses': 'Courses',
  '/services': 'Services',
  '/faculty': 'Faculty',
  '/resources': 'Resources',
  '/projects': 'Projects',
  '/labs': 'Labs',
  '/insights': 'Insights',
  '/certificates': 'Certificates',
};

export function labelFor(path: string): string {
  if (KNOWN_LABELS[path]) return KNOWN_LABELS[path];
  const seg = path.split('/').filter(Boolean)[0] ?? '';
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

/**
 * Derives a deduped, one-check-per-top-level-section page list from a
 * set of sitemap entries -- deliberately kept as a pure function taking
 * plain {url} objects (not Next.js's MetadataRoute.Sitemap type, and
 * not calling sitemap() itself), so this stays testable with plain
 * mock data and has no dependency on the database sitemap() queries
 * behind the scenes.
 *
 * This exists specifically so the site status check can never again
 * silently drift out of sync with what pages actually exist (the bug
 * that let Labs and Insights go unmonitored) -- see sitePages.test.ts
 * for the regression test that would catch it if this logic ever goes
 * back to a hardcoded list.
 */
export function dedupeToTopLevelPages(
  entries: { url: string }[],
  base: string
): { name: string; path: string }[] {
  const seen = new Set<string>();
  const pages: { name: string; path: string }[] = [];

  for (const entry of entries) {
    const path = entry.url.replace(base, '') || '/';
    const topLevel = path === '/' ? '/' : '/' + (path.split('/').filter(Boolean)[0] ?? '');
    if (seen.has(topLevel)) continue;
    seen.add(topLevel);
    pages.push({ name: labelFor(topLevel), path: topLevel });
  }

  return pages;
}
