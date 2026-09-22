import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { buildInvoicesWorkbook, type InvoiceRow } from '@/lib/invoicesExport';
import { fyStartYearFor, fyLabel } from '@/lib/financialYear';

// GET /api/admin/invoices/report-export?fy=2025
// Downloads confirmed-revenue invoices for one financial year (Apr-Mar)
// as the same workbook format used elsewhere (buildInvoicesWorkbook),
// filtered client-side by financial year since invoices.date is
// free-text DD/MM/YYYY, not filterable accurately at the query level.
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fyParam = request.nextUrl.searchParams.get('fy');
  if (!fyParam || Number.isNaN(Number(fyParam))) {
    return NextResponse.json({ error: 'Missing or invalid fy parameter' }, { status: 400 });
  }
  const fyStartYear = Number(fyParam);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_no, date, client_name, client_gst, client_state, invoice_type, items, total, advance, balance')
    .is('deleted_at', null)
    .neq('invoice_type', 'proforma')
    .order('date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invoices = (data ?? []).filter((inv) => fyStartYearFor(inv.date) === fyStartYear) as InvoiceRow[];
  if (invoices.length === 0) {
    return NextResponse.json({ error: `No confirmed invoices in ${fyLabel(fyStartYear)}` }, { status: 404 });
  }

  const buffer = await buildInvoicesWorkbook(invoices);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YAFT_${fyLabel(fyStartYear).replace(/\s/g, '_')}.xlsx"`,
    },
  });
}
