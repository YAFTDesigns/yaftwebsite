import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitShared } from '@/lib/rateLimitShared';
import { razorpayConfig } from '@/lib/razorpay';
import { loadCatalog, resolveSelection, advanceFor } from '@/lib/courseCatalog';
import { validateBillingDetails } from '@/lib/billingDetails';
import { createCourseOrder } from '@/lib/courseOrder';
import { computeSchedule } from '@/lib/coursePayments';
import { getStudentSession } from '@/lib/student/session';
import { recordInterest } from '@/lib/student/interest';
import { audit } from '@/lib/student/audit';
import { findReusablePlan } from '@/lib/reusablePlan';

import { CONTACT_EMAIL } from '@/lib/contact';
// POST /api/enroll/order { items: ['course:slug' | 'bundle:slug'], currency: 'INR'|'USD', choice: 'advance'|'full', details }
// Individuals only. Creates the payment plan from the catalog prices (never from the browser) and the first Razorpay order.
export async function POST(request: NextRequest) {
  if (process.env.COURSE_CHECKOUT_ENABLED !== '1') return NextResponse.json({ error: 'Online enrolment is not open yet. Please email ' + CONTACT_EMAIL + '.' }, { status: 503 });
  const limited = await rateLimitShared(request, 'enroll-order', { limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const currency = body?.currency === 'USD' ? 'USD' : 'INR';
  const choice = body?.choice === 'full' ? 'full' : 'advance';
  const sel = resolveSelection(await loadCatalog(), body?.items);
  if (!sel.ok) return NextResponse.json({ error: sel.error }, { status: 400 });
  const v = validateBillingDetails(body?.details, { allowOutsideIndia: currency === 'USD' });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (v.value.client_type === 'company') return NextResponse.json({ error: 'Company and team training is arranged by email. Please write to ' + CONTACT_EMAIL + ' for a personalised quote.' }, { status: 400 });

  // A one-item fee of 1 rupee cannot be split; treat as full payment.
  const canSplit = sel.baseTotal >= 2;
  const advance = canSplit ? advanceFor(sel.baseTotal) : null;
  try { computeSchedule(sel.baseTotal, advance); } catch { return NextResponse.json({ error: 'Invalid fee for this selection.' }, { status: 400 }); }

  // Signed-in verified student (identity comes from the session, never from the form). If they already have an open,
  // unpaid plan for exactly this selection, they get it back instead of a duplicate.
  const student = await getStudentSession();
  const structure = advance === null ? 'full' : 'instalments';
  const existing = student ? await findReusablePlan(student.profile.id, { courseSlugs: sel.courseSlugs, baseTotal: sel.baseTotal, advanceBase: advance, structure, currency, isTest: razorpayConfig().test }) : null;

  type Plan = { id: string; token: string; status: string; is_test: boolean; structure: 'instalments' | 'full'; base_total: number; advance_base: number | null; client_name: string; client_email: string; currency: 'INR' | 'USD' };
  let plan: Plan | null = existing as Plan | null;
  if (!plan) {
    const { data: created, error } = await getSupabaseAdmin().from('course_payment_plans').insert({
      token: randomBytes(24).toString('base64url'), ...v.value, description: sel.description, structure,
      base_total: sel.baseTotal, advance_base: advance, is_test: razorpayConfig().test, currency, source: 'enroll', course_slugs: sel.courseSlugs,
      details_confirmed_at: new Date().toISOString(),
    }).select('*').single();
    if (error || !created) { console.error('[enroll] plan insert failed:', error); return NextResponse.json({ error: 'Could not start your enrolment. Please try again.' }, { status: 500 }); }
    plan = created as Plan;
    if (student) {
      const { error: linkErr } = await getSupabaseAdmin().from('student_enrolments').insert({ student_id: student.profile.id, plan_id: created.id, linked_via: 'checkout_signed_in' });
      if (!linkErr) await audit({ actor_type: 'student', actor_ref: student.profile.id, action: 'enrolment_linked_at_checkout', subject: created.id });
    }
  }
  if (student) for (const slug of sel.courseSlugs) await recordInterest(student.profile.id, slug, 'checkout_started');

  const r = await createCourseOrder(plan, { choice, details: v.value });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ orderId: r.orderId, amount: r.amount, currency: r.currency, keyId: r.keyId, kind: r.kind, name: r.name, email: r.email, token: plan.token });
}
