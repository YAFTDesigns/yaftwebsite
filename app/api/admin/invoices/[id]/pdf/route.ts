import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { generatePDF, toInvoicePdfData } from '@/lib/invoicePdf';

// GET /api/admin/invoices/[id]/pdf
// Regenerates the PDF from the invoice's current database row and
// returns the file directly -- no email involved, nothing marked as
// sent, nothing logged as an event. Purely a "let me see/grab the
// file" action, separate from the send flow entirely. Works the same
// for a draft that's never been emailed, an already-sent invoice, or
// a proforma.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: inv, error } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (error || !inv) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const pdfData = toInvoicePdfData(inv);

  try {
    const pdfBuffer = await generatePDF(pdfData);
    const filename = `${inv.invoice_type === 'proforma' ? 'YAFT_Proforma' : 'YAFT_Invoice'}_${inv.invoice_no}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[invoice-pdf-download] failed:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
