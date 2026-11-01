import { randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { COURSE_NAV_LIST } from '@/app/courses/courseNav';
import { audit } from './audit';
import { requestClaimLink } from './claims';

/** Real bills look like YAFT-102026-21. Test (YAFT-TEST-) and proforma (YAFT-PF-) numbers are not accepted. */
export function parseBillNo(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toUpperCase().replace(/\s+/g, '');
  return /^YAFT-\d{6}-\d{1,4}$/.test(s) ? s : null;
}

/** Which course(s) a bill's line text is about. Empty when the wording is not recognisable. */
export function coursesInBill(items: unknown): string[] {
  const text = (Array.isArray(items) ? items : []).map((i) => String((i as { desc?: unknown })?.desc ?? '')).join(' | ').toLowerCase();
  const out = new Set<string>();
  if (/grasshopper/.test(text)) out.add('grasshopper-architecture');
  if (/revit|rhino\.inside/.test(text)) out.add('revit-rhino-inside');
  if (/climate|aec|ladybug/.test(text)) out.add('rhino-aec-climate');
  if (/industrial/.test(text)) out.add('rhino-industrial-design');
  if (/wearable|footwear/.test(text)) out.add('rhino-wearables-footwear');
  if (/rhino/.test(text) && /architecture/.test(text) && !/revit/.test(text)) out.add('rhino-architecture');
  return [...out];
}

export type BillClaim = 'linked' | 'pending' | 'invalid';

/**
 * An older student enters the number printed on their bill. We find that bill, and:
 *  - bill email equals the student's VERIFIED email: link now
 *  - bill has a different email: send a one-time confirmation link to that billing address (same flow as pay-link claims)
 *  - bill has no usable email: leave a note for the admin to link by hand
 * Anything else (unknown, deleted, test, already someone else's) answers the same generic 'pending', so nothing can be probed.
 */
export async function claimByBill(student: { id: string; userId: string; email: string }, billNoRaw: unknown, courseSlug: unknown): Promise<BillClaim> {
  const billNo = parseBillNo(billNoRaw);
  const course = COURSE_NAV_LIST.find((c) => c.dbSlug === courseSlug);
  if (!billNo || !course) return 'invalid';
  const admin = getSupabaseAdmin();
  const { data: inv } = await admin.from('invoices').select('id, invoice_no, client_name, client_email, client_phone, client_state, total, balance, items, invoice_type, course_plan_id, course_payment_id').eq('invoice_no', billNo).is('deleted_at', null).maybeSingle();
  if (!inv) return 'pending';
  // bills made by the website's own checkout already belong to a plan with a pay trail; those use the normal email/claim flow
  if (inv.course_payment_id) return 'pending';
  // only training bills can open a course (not consulting, workshop or other work)
  if ((inv.invoice_type || 'training') !== 'training') return 'pending';

  // A corporate bill (one bill, many certificates) belongs to the company, not to one student: never link it to a portal account.
  const { count: corp } = await admin.from('certificates').select('id', { count: 'exact', head: true }).eq('batch_ref', billNo);
  if ((corp ?? 0) > 0) return 'pending';

  let planId: string | null = inv.course_plan_id ?? null;
  let token: string | null = null;
  if (planId) {
    const { data: p } = await admin.from('course_payment_plans').select('id, token, source').eq('id', planId).maybeSingle();
    if (!p || p.source !== 'legacy') return 'pending';
    token = p.token;
    const { data: owner } = await admin.from('student_enrolments').select('student_id').eq('plan_id', planId).maybeSingle();
    if (owner) return owner.student_id === student.id ? 'linked' : 'pending';
  } else {
    const total = Number(inv.total);
    if (!Number.isFinite(total) || total <= 0) return 'pending';
    token = randomBytes(24).toString('base64url');
    const { data: plan, error } = await admin.from('course_payment_plans').insert({
      token, client_name: inv.client_name || 'Student', client_email: String(inv.client_email || student.email), client_phone: inv.client_phone ?? null,
      client_type: 'individual', client_state: inv.client_state || 'Tamil Nadu', description: course.title, structure: 'full',
      base_total: Math.max(1, Math.round(total / 1.18)), status: 'complete', is_test: false, currency: 'INR', source: 'legacy', course_slugs: [course.dbSlug],
    }).select('id').single();
    if (error || !plan) return 'pending';
    planId = plan.id as string;
    const { data: set } = await admin.from('invoices').update({ course_plan_id: planId }).eq('id', inv.id).is('course_plan_id', null).select('id');
    if (!set?.length) { await admin.from('course_payment_plans').delete().eq('id', planId); return 'pending'; }
  }

  // Anything that does not look fully settled and matching goes to a person instead of linking.
  const detected = coursesInBill(inv.items);
  const owes = Number(inv.balance) > 0;
  const mismatch = detected.length > 0 && !detected.includes(course.dbSlug);
  if (owes || mismatch) {
    await admin.from('claim_reviews').insert({ user_id: student.userId, plan_id: planId, note: `Bill ${billNo}: ${owes ? `still shows a balance of Rs ${Number(inv.balance)}` : `bill wording suggests ${detected.join(', ')}`}; student chose ${course.title}. Check, then link or reject.` });
    return 'pending';
  }

  const billEmail = String(inv.client_email || '').trim().toLowerCase();
  if (billEmail && billEmail === student.email.trim().toLowerCase()) {
    const { error } = await admin.from('student_enrolments').insert({ student_id: student.id, plan_id: planId, linked_via: 'bill_number' });
    if (error) { await admin.from('claim_reviews').insert({ user_id: student.userId, plan_id: planId, note: `Bill ${billNo}: plan already linked to someone else` }); return 'pending'; }
    await audit({ actor_type: 'student', actor_ref: student.id, action: 'enrolment_linked_by_bill_number', subject: planId });
    return 'linked';
  }
  if (billEmail.includes('@') && token) { await requestClaimLink({ id: student.id }, token); return 'pending'; }
  await admin.from('claim_reviews').insert({ user_id: student.userId, plan_id: planId, note: `Bill ${billNo} has no billing email; student asked to link it. Check and link by hand.` });
  return 'pending';
}
