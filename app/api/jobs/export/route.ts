import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { buildJobsWorkbook } from '@/lib/jobsExport';

// GET /api/jobs/export?status=Pending  (status omitted or 'all' = everything, excluding trash)
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const supabase = getSupabaseAdmin();
  let query = supabase.from('jobs').select('*').is('deleted_at', null).order('job_date', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const buffer = await buildJobsWorkbook(jobs ?? []);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filenameSuffix = status && status !== 'all' ? `_${status}` : '';

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YAFT_Jobs${filenameSuffix}_${dateStamp}.xlsx"`,
    },
  });
}
