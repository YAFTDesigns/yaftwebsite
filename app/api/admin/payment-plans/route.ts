import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { computeSchedule } from '@/lib/coursePayments';
import { razorpayConfig } from '@/lib/razorpay';
import { reconcilePlans, type ReportInvoice } from '@/lib/fyReport';
import { logCourseEvent } from '@/lib/coursePaymentFulfil';
import { adminEmail } from '@/lib/admin/adminEmail';
import { INDIAN_STATES, GSTIN_RE } from '@/lib/indianStates';
import { STRICT_EMAIL_RE } from '@/lib/enquiryFields';

// Covered by the proxy matcher (/api/admin/:path*); admin check repeated as defence in depth.

export async function GET() {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: plans, error } = await supabase.from('course_payment_plans').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'Could not load plans' }, { status: 500 });
  const { data: pays } = await supabase.from('course_payments').select('id, plan_id, kind, status, paid_at, payment_id, amount_minor, invoice_id, invoice_no, invoice_emailed, sync_status, sync_error, sync_attempts, gateway_fee_minor, gateway_tax_minor, test_mode').eq('status', 'paid');
  const { data: adjs } = await supabase.from('invoice_adjustments').select('*').order('created_at', { ascending: false }).limit(200);
  const { data: bills } = await supabase.from('invoices').select('id, invoice_no, date, client_name, client_state, invoice_type, items, total, balance, course_plan_id, course_payment_id').not('course_payment_id', 'is', null).is('deleted_at', null);
  const mismatches = reconcilePlans((pays ?? []) as never, (bills ?? []) as (ReportInvoice & { id: string })[], (adjs ?? []) as never);
  return NextResponse.json({
    data: (plans ?? []).map((p) => ({ ...p, payments: (pays ?? []).filter((x) => x.plan_id === p.id) })),
    adjustments: adjs ?? [], mismatches, testMode: razorpayConfig().test,
  });
}

// POST { client_name, client_email, client_phone, client_type, client_company, client_gst, client_state, description, base_total, advance_base, lead_id? }
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const client_name = str(b.client_name, 100);
  const client_email = str(b.client_email, 200).toLowerCase();
  const description = str(b.description, 200);
  const client_state = str(b.client_state, 60) || 'Tamil Nadu';
  const client_gst = str(b.client_gst, 20).toUpperCase();
  const client_type = b.client_type === 'company' ? 'company' : 'individual';
  const base_total = Number(b.base_total);
  const full = b.advance_base === '' || b.advance_base === null || b.advance_base === undefined;
  const advance_base = full ? null : Number(b.advance_base);
  if (!client_name) return NextResponse.json({ error: 'Client name is required.' }, { status: 400 });
  if (!STRICT_EMAIL_RE.test(client_email)) return NextResponse.json({ error: 'Enter a valid client email.' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'Describe the course (shown on the invoice).' }, { status: 400 });
  if (!(INDIAN_STATES as readonly string[]).includes(client_state)) return NextResponse.json({ error: 'Choose a valid state.' }, { status: 400 });
  if (client_gst && !GSTIN_RE.test(client_gst)) return NextResponse.json({ error: 'That GSTIN does not look valid.' }, { status: 400 });
  try { computeSchedule(base_total, advance_base); } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

  const token = randomBytes(24).toString('base64url');
  const { data, error } = await getSupabaseAdmin().from('course_payment_plans').insert({
    token, client_name, client_email, client_phone: str(b.client_phone, 30) || null, client_type,
    client_company: client_type === 'company' ? str(b.client_company, 120) || null : null,
    client_gst: client_gst || null, client_state, description, base_total, advance_base,
    structure: full ? 'full' : 'instalments', is_test: razorpayConfig().test,
    lead_id: typeof b.lead_id === 'string' && b.lead_id ? b.lead_id : null,
  }).select('id, token').single();
  if (error || !data) { console.error('[payment-plans] insert failed:', error); return NextResponse.json({ error: 'Could not create the plan.' }, { status: 500 }); }
  await logCourseEvent({ planId: data.id, event: 'plan_created', detail: { by: await adminEmail(), base_total, advance_base, structure: full ? 'full' : 'instalments' } });
  return NextResponse.json({ ok: true, id: data.id, token: data.token });
}

// PATCH { id, action: 'cancel' }  stops the link working (paid instalments and invoices stay on record).
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!b?.id || b.action !== 'cancel') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { error } = await getSupabaseAdmin().from('course_payment_plans').update({ status: 'cancelled' }).eq('id', String(b.id)).eq('status', 'active');
  if (error) return NextResponse.json({ error: 'Could not cancel' }, { status: 500 });
  await logCourseEvent({ planId: String(b.id), event: 'plan_cancelled', detail: { by: await adminEmail() } });
  return NextResponse.json({ ok: true });
}
