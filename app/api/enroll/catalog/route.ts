import { NextResponse } from 'next/server';
import { loadCatalog } from '@/lib/courseCatalog';
import { getInrPerUsd, fxBufferPercent } from '@/lib/fx';

// Public: what can be bought online, at what fee, and the current USD rate. Nothing private.
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.COURSE_CHECKOUT_ENABLED !== '1') return NextResponse.json({ enabled: false, items: [] });
  const [items, q] = await Promise.all([loadCatalog(), getInrPerUsd()]);
  return NextResponse.json({ enabled: true, items, fx: q ? { inrPerUsd: q.inrPerUsd, bufferPercent: fxBufferPercent() } : null }, { headers: { 'Cache-Control': 'no-store' } });
}
