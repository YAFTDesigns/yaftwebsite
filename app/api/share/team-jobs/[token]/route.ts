import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { buildJobsWorkbook } from '@/lib/jobsExport';
import { attachStatusDates } from '@/lib/jobStatusDates';

// GET /api/share/team-jobs/[token]
// Deliberately public -- no admin auth, same "anyone with the link"
// model as the per-client share links: the long, random, unguessable
// token (crypto.randomUUID, generated in /api/team/[id]/share-link) is
// the credential, revocable from /admin/team at any time.
//
// Unlike the client share link (one client's jobs, full pricing since
// that client is the one being billed), this is every active job
// across every client, WITHOUT pricing -- job no, date, client, type,
// status, notes only. Built for internal team members (design team,
// etc.) who need to see the work queue but not what's being charged.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60000 });
  if (limited) return limited;

  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data: member, error: memberErr } = await supabase
    .from('team_members')
    .select('id, name')
    .eq('share_token', token)
    .is('deleted_at', null)
    .maybeSingle();

  if (memberErr || !member) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .is('deleted_at', null)
    .order('job_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = await attachStatusDates(supabase, jobs ?? []);
  const buffer = await buildJobsWorkbook(rows, { hidePricing: true });
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YAFT_Job_Sheet_${dateStamp}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
