import { NextRequest, NextResponse } from 'next/server';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { completeFulfilment, logCourseEvent } from '@/lib/coursePaymentFulfil';
import { adminEmail } from '@/lib/admin/adminEmail';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// POST { payment_row_id }  Safely re-runs the bill step for one paid instalment. Idempotent: it never makes a second bill.
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const id = typeof b?.payment_row_id === 'string' ? b.payment_row_id : '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { data: row } = await getSupabaseAdmin().from('course_payments').select('plan_id, payment_id, status').eq('id', id).maybeSingle();
  if (!row || row.status !== 'paid') return NextResponse.json({ error: 'Only paid instalments can be retried.' }, { status: 409 });
  await logCourseEvent({ planId: row.plan_id, paymentRowId: id, razorpayPaymentId: row.payment_id, event: 'admin_retry', detail: { by: await adminEmail() } });
  const r = await completeFulfilment(id);
  return NextResponse.json(r.ok ? { ok: true, invoice_no: r.invoiceNo } : { ok: false, error: r.error }, { status: r.ok ? 200 : 502 });
}
