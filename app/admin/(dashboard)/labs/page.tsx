import LabsClient from './LabsClient';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function LabsPage() {
  const supabase = getSupabaseAdmin();
  const [{ data: scripts }, { data: categories }, { data: events }] = await Promise.all([
    supabase.from('lab_scripts').select('*').is('deleted_at', null).order('display_order'),
    supabase.from('lab_categories').select('*').order('display_order'),
    // Raw rows, aggregated below in JS -- volume here is still small
    // (a brand new event type), so this doesn't need a DB view the
    // way analytics_events' page_view/trend queries did once those
    // hit the 1,000-row default cap earlier this session.
    supabase
      .from('analytics_events')
      .select('event_type, utm_source')
      .in('event_type', ['lab_script_view', 'lab_script_download'])
      .eq('is_internal', false),
  ]);

  const bySource = { instagram: { views: 0, downloads: 0 }, organic: { views: 0, downloads: 0 } };
  for (const e of events ?? []) {
    const bucket = e.utm_source === 'instagram' ? 'instagram' : 'organic';
    if (e.event_type === 'lab_script_view') bySource[bucket].views++;
    else if (e.event_type === 'lab_script_download') bySource[bucket].downloads++;
  }

  return <LabsClient initialScripts={scripts ?? []} initialCategories={categories ?? []} sourceBreakdown={bySource} />;
}
