import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';

const GST_LABEL: Record<string, string> = { intra: 'Intra-state (CGST+SGST)', inter: 'Inter-state (IGST)', none: 'No GST' };

// GET /api/jobs/export?status=Pending  (status omitted or 'all' = everything, excluding trash)
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const supabase = getSupabaseAdmin();
  let query = supabase.from('jobs').select('*').is('deleted_at', null).order('job_date', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

  const { data: jobs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'YAFT Designs';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Jobs', { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = [
    { header: 'Job No', key: 'job_no', width: 12 },
    { header: 'Date', key: 'job_date', width: 12 },
    { header: 'Client', key: 'client_name', width: 26 },
    { header: 'Job Type', key: 'job_type', width: 18 },
    { header: 'Qty', key: 'qty', width: 8 },
    { header: 'Rate (INR)', key: 'rate', width: 12 },
    { header: 'GST Type', key: 'gst_type', width: 22 },
    { header: 'CGST', key: 'cgst', width: 10 },
    { header: 'SGST', key: 'sgst', width: 10 },
    { header: 'IGST', key: 'igst', width: 10 },
    { header: 'Total (INR)', key: 'total', width: 13 },
    { header: 'Status', key: 'status', width: 11 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };

  const moneyCols = ['rate', 'cgst', 'sgst', 'igst', 'total'];

  (jobs ?? []).forEach((j) => {
    const row = sheet.addRow({
      job_no: j.job_no || '',
      job_date: j.job_date,
      client_name: j.client_name,
      job_type: j.job_type,
      qty: Number(j.qty),
      rate: Number(j.rate),
      gst_type: GST_LABEL[j.gst_type] ?? j.gst_type,
      cgst: Number(j.cgst),
      sgst: Number(j.sgst),
      igst: Number(j.igst),
      total: Number(j.total),
      status: j.status,
      notes: j.notes || '',
    });
    moneyCols.forEach((key) => {
      row.getCell(key).numFmt = '#,##0.00';
    });
  });

  // Grand total row
  if ((jobs ?? []).length > 0) {
    const totalRow = sheet.addRow({ job_no: '', job_date: '', client_name: '', job_type: '', qty: '', rate: 'TOTAL', gst_type: '', cgst: '', sgst: '', igst: '', total: (jobs ?? []).reduce((s, j) => s + Number(j.total), 0), status: '', notes: '' });
    totalRow.font = { bold: true };
    totalRow.getCell('total').numFmt = '#,##0.00';
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filenameSuffix = status && status !== 'all' ? `_${status}` : '';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="YAFT_Jobs${filenameSuffix}_${dateStamp}.xlsx"`,
    },
  });
}
