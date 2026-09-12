import { NextResponse } from 'next/server';
import { getQueueLength, getInvoiceQueueLength } from '@/lib/queue';
import sitemap from '@/app/sitemap';

const BASE = 'https://www.yaftdesigns.com';

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

function labelFor(path: string): string {
  if (KNOWN_LABELS[path]) return KNOWN_LABELS[path];
  const seg = path.split('/').filter(Boolean)[0] ?? '';
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

// Derives the checked-pages list from the real sitemap rather than a
// hardcoded array -- this is exactly what caught Labs and Insights
// missing before, and the same class of gap would happen again the
// next time a new top-level section gets added and someone forgets
// to also update a second, separate list. Deduped to one check per
// top-level section (e.g. /insights/some-post and /insights/other-post
// both collapse to a single /insights check) rather than one row per
// individual course/project/blog post -- this is a site-up overview,
// not per-article monitoring, and the sitemap can have dozens of
// individual entries.
async function getPagesToCheck(): Promise<{ name: string; path: string }[]> {
  const entries = await sitemap();
  const seen = new Set<string>();
  const pages: { name: string; path: string }[] = [];

  for (const entry of entries) {
    const path = entry.url.replace(BASE, '') || '/';
    const topLevel = path === '/' ? '/' : '/' + (path.split('/').filter(Boolean)[0] ?? '');
    if (seen.has(topLevel)) continue;
    seen.add(topLevel);
    pages.push({ name: labelFor(topLevel), path: topLevel });
  }

  return pages;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? BASE;
  const PAGES = await getPagesToCheck();

  const [results, enquiryQueue, invoiceQueue] = await Promise.all([
    Promise.all(
      PAGES.map(async (page) => {
        const start = Date.now();
        try {
          const res = await fetch(`${base}${page.path}`, {
            method: 'HEAD',
            cache: 'no-store',
            signal: AbortSignal.timeout(8000),
          });
          return {
            ...page,
            status: res.ok ? 'up' : 'down',
            code: res.status,
            ms: Date.now() - start,
          };
        } catch {
          return {
            ...page,
            status: 'down',
            code: 0,
            ms: Date.now() - start,
          };
        }
      })
    ),
    getQueueLength().catch(() => 0),
    getInvoiceQueueLength().catch(() => 0),
  ]);

  const allUp = results.every(r => r.status === 'up');

  return NextResponse.json({
    results,
    allUp,
    checkedAt: new Date().toISOString(),
    queues: { enquiry: enquiryQueue, invoice: invoiceQueue },
  });
}
