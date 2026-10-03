import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeQuery } from '@/lib/admin/safeQuery';
import LeadStatusEditor from '@/components/admin/LeadStatusEditor';
import { SEGMENTS, SEGMENT_LABELS, AUDIENCE_LABELS, FUNNEL_LABELS } from '@/lib/enquiryFields';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

type Enquiry = {
  id: string;
  name: string;
  email: string;
  course_interest: string | null;
  message: string | null;
  created_at: string;
  lead_id: string | null;
  segment: string | null;
  phone: string | null;
  audience: string | null;
  funnel: string | null;
  need: string | null;
  organisation: string | null;
};

type LeadStatusRow = { id: string; status: string; notes: string | null; follow_up_date: string | null };

async function getEnquiries(): Promise<{ enquiries: Enquiry[]; error: string | null; leadStatus: Record<string, LeadStatusRow> }> {
  const supabase = getSupabaseAdmin();
  const result = await safeQuery<Enquiry[]>(
    supabase
      .from('enquiries')
      .select('id, name, email, course_interest, message, created_at, lead_id, segment, phone, audience, funnel, need, organisation')
      .order('created_at', { ascending: false }),
    [],
    'enquiries list'
  );

  const leadIds = [...new Set(result.data.map((e) => e.lead_id).filter((id): id is string => !!id))];
  let leadStatus: Record<string, LeadStatusRow> = {};
  if (leadIds.length > 0) {
    const { data: leadRows } = await supabase.from('leads').select('id, status, notes, follow_up_date').in('id', leadIds);
    leadStatus = Object.fromEntries((leadRows ?? []).map((r) => [r.id, r]));
  }

  return { enquiries: result.data, error: result.error, leadStatus };
}

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  const { segment: segmentParam } = await searchParams;
  const { enquiries: all, error, leadStatus } = await getEnquiries();
  const segmentFilter = segmentParam && (segmentParam === 'unknown' || (SEGMENTS as readonly string[]).includes(segmentParam)) ? segmentParam : null;
  const enquiries = segmentFilter ? all.filter((e) => (e.segment ?? 'unknown') === segmentFilter) : all;
  const counts: Record<string, number> = { unknown: 0 };
  for (const e of all) counts[e.segment ?? 'unknown'] = (counts[e.segment ?? 'unknown'] ?? 0) + 1;
  const tabStyle = (active: boolean) => ({ fontFamily: 'var(--mono)', fontSize: 12, marginRight: 14, color: active ? '#fff' : '#777', textDecoration: active ? 'underline' : 'none' } as const);

  return (
    <>
      <h1 className={styles.sectionTitle}>Enquiries ({enquiries.length}{segmentFilter ? ` of ${all.length}` : ''})</h1>

      <p style={{ marginBottom: 16 }}>
        <a href="/admin/enquiries" style={tabStyle(!segmentFilter)}>All ({all.length})</a>
        {SEGMENTS.map((s) => (
          <a key={s} href={`/admin/enquiries?segment=${s}`} style={tabStyle(segmentFilter === s)}>{SEGMENT_LABELS[s]} ({counts[s] ?? 0})</a>
        ))}
        <a href="/admin/enquiries?segment=unknown" style={tabStyle(segmentFilter === 'unknown')}>Not recorded ({counts.unknown})</a>
      </p>

      {error && (
        <div style={{ background:'#2a0a0a', border:'1px solid #5a1a1a', borderRadius:8, padding:'12px 16px', marginBottom:20 }}>
          <p style={{ fontFamily:'var(--mono)', fontSize:12, color:'#e55' }}>
            Could not load enquiries: {error}
          </p>
        </div>
      )}

      {enquiries.length === 0 ? (
        <p className={styles.empty}>{error ? 'No data available right now.' : 'No enquiries yet.'}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Who</th>
              <th>Funnel</th>
              <th>Interested in</th>
              <th>Need</th>
              <th>Message</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enq) => {
              const ls = enq.lead_id ? leadStatus[enq.lead_id] : undefined;
              return (
                <tr key={enq.id}>
                  <td>{enq.lead_id ? <Link href={`/admin/leads/${enq.lead_id}`} style={{ textDecoration: 'underline' }}>{enq.name}</Link> : enq.name}</td>
                  <td>{enq.email}</td>
                  <td>{enq.phone ?? '—'}</td>
                  <td>
                    {enq.audience ? AUDIENCE_LABELS[enq.audience as keyof typeof AUDIENCE_LABELS] : enq.segment ? SEGMENT_LABELS[enq.segment as keyof typeof SEGMENT_LABELS] ?? enq.segment : '—'}
                    {enq.organisation && <div style={{ opacity: 0.6, fontSize: 11 }}>{enq.organisation}</div>}
                  </td>
                  <td>{enq.funnel ? FUNNEL_LABELS[enq.funnel as keyof typeof FUNNEL_LABELS] : '—'}</td>
                  <td>{enq.course_interest ?? '—'}</td>
                  <td>{enq.need && enq.need !== enq.course_interest ? enq.need : '—'}</td>
                  <td style={{ maxWidth: 320 }}>{enq.message ?? '—'}</td>
                  <td>
                    {ls ? (
                      <LeadStatusEditor leadId={ls.id} initialStatus={ls.status} initialNotes={ls.notes} initialFollowUp={ls.follow_up_date} />
                    ) : '—'}
                  </td>
                  <td>{new Date(enq.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
