import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSession } from '@/lib/student/session';
import { generatePDF, toInvoicePdfData } from '@/lib/invoicePdf';

// A student can download a bill only if it belongs to a plan linked to THEIR account. Anything else is a plain 404.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const s = await getStudentSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { invoiceId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const admin = getSupabaseAdmin();
  const { data: inv } = await admin.from('invoices').select('*').eq('id', invoiceId).maybeSingle();
  if (!inv?.course_plan_id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: own } = await admin.from('student_enrolments').select('id').eq('student_id', s.profile.id).eq('plan_id', inv.course_plan_id).maybeSingle();
  if (!own) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const buf = await generatePDF(toInvoicePdfData(inv));
    const name = `YAFT_Invoice_${String(inv.invoice_no).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
    return new NextResponse(new Uint8Array(buf), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (e) {
    console.error('[student-bill-pdf] failed:', e);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
