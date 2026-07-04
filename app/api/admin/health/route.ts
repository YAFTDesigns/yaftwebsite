import { NextResponse } from 'next/server';
import { getQueueLength, getInvoiceQueueLength } from '@/lib/queue';

const PAGES = [
  { name: 'Home',       path: '/' },
  { name: 'Courses',    path: '/courses' },
  { name: 'Services',   path: '/services' },
  { name: 'Faculty',    path: '/faculty' },
  { name: 'Resources',  path: '/resources' },
  { name: 'Projects',   path: '/projects' },
];

export const dynamic = 'force-dynamic';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yaftdesigns.com';

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
