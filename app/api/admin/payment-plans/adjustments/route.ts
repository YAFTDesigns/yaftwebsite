import { NextRequest, NextResponse } from 'next/server';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { creditNoteFromRefund } from '@/lib/fyReport';
import { logCourseEvent } from '@/lib/coursePaymentFulfil';
import { adminEmail } from '@/lib/admin/adminEmail';

function ddmmyyyy(d = new Date()): string {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(ist.getUTCDate())}/${p(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
}

// POST { id, action: 'issue' | 'dismiss', amount?: rupees (gross credit, defaults to the refund), reason }
// 'issue' records a credit note against the original bill (the bill itself is never edited). Issued rows are final.
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const id = typeof b?.id === 'string' ? b.id : '';
  const reason = typeof b?.reason === 'string' ? b.reason.trim().slice(0, 300) : '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || (b?.action !== 'issue' && b?.action !== 'dismiss')) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'Give a reason (kept in the audit trail).' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: adj } = await supabase.from('invoice_adjustments').select('*').eq('id', id).maybeSingle();
  if (!adj || adj.status !== 'needs_review') return NextResponse.json({ error: 'Already handled.' }, { status: 409 });
  const by = await adminEmail();

  if (b.action === 'dismiss') {
    const { data } = await supabase.from('invoice_adjustments').update({ status: 'dismissed', reason }).eq('id', id).eq('status', 'needs_review').select('id');
    if (!data?.length) return NextResponse.json({ error: 'Already handled.' }, { status: 409 });
    await logCourseEvent({ planId: adj.plan_id, paymentRowId: adj.payment_row_id, event: 'refund_dismissed', detail: { by, reason } });
    return NextResponse.json({ ok: true });
  }

  const { data: bill } = adj.invoice_id ? await supabase.from('invoices').select('id, total, client_state').eq('id', adj.invoice_id).maybeSingle() : { data: null };
  if (!bill) return NextResponse.json({ error: 'The original bill is missing, so a credit note cannot be raised.' }, { status: 409 });
  const grossMinor = b.amount === undefined ? Number(adj.refund_minor) : Math.round(Number(b.amount) * 100);
  if (!Number.isFinite(grossMinor) || grossMinor < 1 || grossMinor > Number(adj.refund_minor) || grossMinor / 100 > Number(bill.total)) {
    return NextResponse.json({ error: 'Credit note amount must be more than 0 and no more than the refund and the bill.' }, { status: 400 });
  }
  // Total credited so far against this bill may never exceed the bill.
  const { data: prior } = await supabase.from('invoice_adjustments').select('total').eq('invoice_id', bill.id).eq('status', 'issued');
  if ((prior ?? []).reduce((s, r) => s + Number(r.total), 0) + grossMinor / 100 > Number(bill.total) + 0.001) {
    return NextResponse.json({ error: 'Credit notes would exceed the bill.' }, { status: 400 });
  }
  const cn = creditNoteFromRefund(grossMinor, bill.client_state ?? '');
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const mmyyyy = String(ist.getUTCMonth() + 1).padStart(2, '0') + ist.getUTCFullYear();
  let number = '';
  let done = false;
  for (let attempt = 0; attempt < 5 && !done; attempt++) {
    const { data: used } = await supabase.from('invoice_adjustments').select('credit_note_no').like('credit_note_no', adj.is_test ? 'CN-TEST-%' : `CN-${mmyyyy}-%`);
    const seq = (used ?? []).map((r) => parseInt(String(r.credit_note_no).split('-').pop() ?? '0', 10)).filter((x) => !Number.isNaN(x));
    number = adj.is_test ? `CN-TEST-${String((seq.length ? Math.max(...seq) : 0) + 1).padStart(2, '0')}` : `CN-${mmyyyy}-${String((seq.length ? Math.max(...seq) : 0) + 1).padStart(2, '0')}`;
    const { data, error } = await supabase.from('invoice_adjustments').update({
      status: 'issued', credit_note_no: number, issued_date: ddmmyyyy(), issued_at: new Date().toISOString(), reason, ...cn,
    }).eq('id', id).eq('status', 'needs_review').select('id');
    if (!error && data?.length) done = true;
    else if (!error) return NextResponse.json({ error: 'Already handled.' }, { status: 409 });
    else if (error.code !== '23505') return NextResponse.json({ error: 'Could not issue the credit note.' }, { status: 500 });
  }
  if (!done) return NextResponse.json({ error: 'Could not pick a credit note number, try again.' }, { status: 500 });
  await logCourseEvent({ planId: adj.plan_id, paymentRowId: adj.payment_row_id, event: 'credit_note_issued', detail: { by, number, total: cn.total, reason } });
  return NextResponse.json({ ok: true, credit_note_no: number });
}
