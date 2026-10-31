import { NextResponse } from 'next/server';
import { loadLiveBills } from '@/lib/liveBills';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

// Admin only (also covered by the /api/admin/* proxy): the latest paid course bills with what is left on each course.
export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  return NextResponse.json({ bills: await loadLiveBills(40) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
