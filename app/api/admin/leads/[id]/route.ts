import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { LEAD_STATUSES, PROPOSAL_STATUSES, PAYMENT_STATUSES, PROPOSAL_LABELS, PAYMENT_LABELS } from '@/lib/admin/leadPipeline';

type Note = { kind: 'note' | 'status' | 'follow_up' | 'proposal' | 'payment'; body: string };

// PATCH /api/admin/leads/[id]
//   { declined?, status?, notes?, follow_up_date?, proposal_status?, payment_status?, service_interest? }
// declined stays the separate, cron-checked "stop contacting" flag. Everything
// else is the pipeline layered on top; each real change also writes a history
// line to lead_notes so the lead's timeline is complete.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: cur, error: curErr } = await supabase
    .from('leads')
    .select('status, notes, follow_up_date, proposal_status, payment_status, service_interest')
    .eq('id', id)
    .single();
  if (curErr || !cur) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const update: Record<string, unknown> = {};
  const history: Note[] = [];
  const now = new Date().toISOString();

  if (typeof body.declined === 'boolean') update.declined = body.declined;
  if (typeof body.status === 'string') {
    if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    update.status = body.status;
    if (body.status !== cur.status) history.push({ kind: 'status', body: `Status: ${cur.status} to ${body.status}` });
  }
  if (typeof body.notes === 'string') {
    const n = body.notes.slice(0, 2000);
    update.notes = n || null;
    if (n && n !== cur.notes) history.push({ kind: 'note', body: n });
  }
  if (body.follow_up_date === null || typeof body.follow_up_date === 'string') {
    const d = body.follow_up_date || null;
    if (d !== null && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    update.follow_up_date = d;
    if (d !== cur.follow_up_date) history.push({ kind: 'follow_up', body: d ? `Next follow-up set to ${d}` : 'Next follow-up cleared' });
  }
  if (typeof body.proposal_status === 'string') {
    if (!(PROPOSAL_STATUSES as readonly string[]).includes(body.proposal_status)) return NextResponse.json({ error: 'Invalid proposal status' }, { status: 400 });
    update.proposal_status = body.proposal_status;
    if (body.proposal_status !== cur.proposal_status) {
      update.proposal_updated_at = now;
      history.push({ kind: 'proposal', body: `Proposal: ${PROPOSAL_LABELS[body.proposal_status]}` });
    }
  }
  if (typeof body.payment_status === 'string') {
    if (!(PAYMENT_STATUSES as readonly string[]).includes(body.payment_status)) return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
    update.payment_status = body.payment_status;
    if (body.payment_status !== cur.payment_status) {
      update.payment_updated_at = now;
      history.push({ kind: 'payment', body: `Payment: ${PAYMENT_LABELS[body.payment_status]}` });
    }
  }
  if (typeof body.service_interest === 'string') update.service_interest = body.service_interest.trim().slice(0, 120) || null;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { error } = await supabase.from('leads').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (history.length > 0) {
    const { error: hErr } = await supabase.from('lead_notes').insert(history.map((h) => ({ lead_id: id, ...h })));
    if (hErr) console.error('[leads] history write failed:', hErr);
  }
  return NextResponse.json({ ok: true });
}
