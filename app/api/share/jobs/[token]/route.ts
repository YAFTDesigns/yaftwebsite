import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { buildJobsWorkbook, type JobRow } from '@/lib/jobsExport';
import { attachStatusDates } from '@/lib/jobStatusDates';

// GET /api/share/jobs/[token]
// Deliberately public -- no admin auth. The token itself is the
// credential, same "anyone with the link" model as a Google Docs share
// link: long, random, unguessable (crypto.randomUUID, generated in
// /api/clients/[id]/share-link), and revocable by clearing it from the
// admin Clients page. Always regenerates the file fresh from current
// data on every hit, so the client's link never goes stale.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name')
    .eq('share_token', token)
    .is('deleted_at', null)
    .maybeSingle();

  if (clientErr || !client) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('client_id', client.id)
    .is('deleted_at', null)
    .order('job_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: JobRow[] = await attachStatusDates(supabase, jobs ?? []);

  // Client column is redundant on a sheet that's already scoped to one
  // client, so it's dropped for a cleaner sheet than the admin export.
  const buffer = await buildJobsWorkbook(rows, { hideClientColumn: true, sheetTitle: 'Jobs' });
  const safeClientName = client.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'Client';
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YAFT_Jobs_${safeClientName}_${dateStamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
