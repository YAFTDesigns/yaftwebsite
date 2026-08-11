import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { buildInvoicesWorkbook, type InvoiceRow } from '@/lib/invoicesExport';

// GET /api/admin/invoices/export
// All non-deleted invoices, segregated into one sheet per month --
// meant to be handed to an auditor as a single file covering however
// much of the year is needed.
export async function GET(_request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_no, date, client_name, client_gst, client_state, invoice_type, items, total, advance, balance')
    .is('deleted_at', null)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const buffer = await buildInvoicesWorkbook((data ?? []) as InvoiceRow[]);
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YAFT_Invoices_${dateStamp}.xlsx"`,
    },
  });
}
