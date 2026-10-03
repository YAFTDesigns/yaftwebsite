import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import LeadWorkbench from '@/components/admin/LeadWorkbench';
import DeclinedToggle from '@/components/admin/DeclinedToggle';
import { AUDIENCE_LABELS, FUNNEL_LABELS, type Audience, type Funnel } from '@/lib/enquiryFields';
import styles from '../../admin.module.css';

export const dynamic = 'force-dynamic';

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const KIND_COLOR: Record<string, string> = { note: '#e5a935', status: '#40E0D0', follow_up: '#8ab4f8', proposal: '#c58af9', payment: '#4caf50', system: '#777' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) notFound();

  const [{ data: enquiries }, { data: notes }, { data: syllabus }, { data: emails }] = await Promise.all([
    supabase.from('enquiries').select('id, created_at, course_interest, message, phone, need, organisation, audience, funnel, source_page').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_notes').select('id, kind, body, created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(100),
    supabase.from('syllabus_requests').select('course_slug, requested_at').eq('lead_id', id).order('requested_at', { ascending: false }).limit(10),
    supabase.from('email_logs').select('id, created_at, template, subject, status').eq('to_email', lead.email).order('created_at', { ascending: false }).limit(10),
  ]);

  const box = { border: '1px solid var(--line)', borderRadius: 6, padding: 16, marginBottom: 20 } as const;
  const h = { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 10 } as const;

  return (
    <>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 12 }}><Link href="/admin/today">Today</Link> · <Link href="/admin/leads">All leads</Link></p>
      <h1 className={styles.sectionTitle}>{lead.name ?? lead.email}</h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, opacity: 0.7, marginBottom: 20 }}>
        {lead.email} · source {lead.source ?? '—'}
        {lead.funnel && ` · ${FUNNEL_LABELS[lead.funnel as Funnel]} funnel`}
        {lead.audience && ` · ${AUDIENCE_LABELS[lead.audience as Audience]}`}
        {lead.organisation && ` · ${lead.organisation}`}
        {' · '}first seen {fmt(lead.first_seen)}
      </p>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <div style={box}>
          <div style={h}>Control</div>
          <LeadWorkbench leadId={id} status={lead.status} followUp={lead.follow_up_date} proposal={lead.proposal_status} payment={lead.payment_status} interest={lead.service_interest} />
          <div style={{ marginTop: 16 }}><DeclinedToggle leadId={id} initialDeclined={lead.declined} /></div>
        </div>

        <div>
          <div style={box}>
            <div style={h}>History ({notes?.length ?? 0})</div>
            {lead.notes && !(notes ?? []).some((n) => n.body === lead.notes) && (
              <p style={{ fontSize: 13, marginBottom: 10 }}><span style={{ color: '#777', fontFamily: 'var(--mono)', fontSize: 11 }}>earlier note · </span>{lead.notes}</p>
            )}
            {(notes ?? []).length === 0 && !lead.notes && <p className={styles.empty}>No history yet.</p>}
            {(notes ?? []).map((n) => (
              <p key={n.id} style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
                <span style={{ color: KIND_COLOR[n.kind] ?? '#777', fontFamily: 'var(--mono)', fontSize: 11 }}>{fmt(n.created_at)} · {n.kind} · </span>{n.body}
              </p>
            ))}
          </div>

          <div style={box}>
            <div style={h}>Enquiries ({enquiries?.length ?? 0})</div>
            {(enquiries ?? []).length === 0 && <p className={styles.empty}>No enquiry form submitted.</p>}
            {(enquiries ?? []).map((e) => (
              <div key={e.id} style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#777' }}>
                  {fmt(e.created_at)}{e.source_page && ` · from ${e.source_page}`}{e.phone && ` · ${e.phone}`}
                </div>
                <div>{[e.course_interest, e.need && e.need !== e.course_interest ? e.need : null].filter(Boolean).join(' / ') || '—'}</div>
                <div style={{ opacity: 0.85 }}>{e.message}</div>
              </div>
            ))}
          </div>

          <div style={box}>
            <div style={h}>Other activity</div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              Syllabus unlocks: {(syllabus ?? []).length === 0 ? 'none' : (syllabus ?? []).map((s) => s.course_slug).join(', ')}
              <br />Emails sent to them: {(emails ?? []).length === 0 ? 'none' : (emails ?? []).map((m) => `${m.template ?? m.subject} (${m.status})`).join(', ')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
