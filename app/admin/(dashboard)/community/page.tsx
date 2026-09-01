import CommunityClient from './CommunityClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Server-fetches exactly what the client's mount effect fetches for the
// default view (student_work, pending): the actual pending list (full
// rows, since it's what's displayed) plus the 5 other counts used for
// badges/breakdown (head-only count queries, not full row data, since
// only the number is ever used for those).
export default async function CommunityPage() {
  const supabase = getSupabaseAdmin();

  const [swPending, pubPendingCount, swApprovedCount, swRejectedCount, pubApprovedCount, pubRejectedCount] = await Promise.all([
    supabase.from('student_work').select('*').eq('status', 'pending').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('student_work').select('id', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
    supabase.from('student_work').select('id', { count: 'exact', head: true }).eq('status', 'rejected').is('deleted_at', null),
    supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
    supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'rejected').is('deleted_at', null),
  ]);

  return (
    <CommunityClient
      initialStudentWork={swPending.data ?? []}
      initialStatusBreakdown={{
        sw_approved: swApprovedCount.count ?? 0,
        sw_pending_all: swPending.data?.length ?? 0,
        sw_rejected: swRejectedCount.count ?? 0,
        pub_approved: pubApprovedCount.count ?? 0,
        pub_pending_all: pubPendingCount.count ?? 0,
        pub_rejected: pubRejectedCount.count ?? 0,
      }}
    />
  );
}
