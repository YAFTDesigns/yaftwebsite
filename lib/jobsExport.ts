import ExcelJS from 'exceljs';

const GST_LABEL: Record<string, string> = { intra: 'Intra-state (CGST+SGST)', inter: 'Inter-state (IGST)', none: 'No GST' };

export type JobRow = {
  job_no: string | null;
  job_date: string;
  client_name: string;
  job_type: string;
  qty: number | string;
  rate: number | string;
  gst_type: string;
  cgst: number | string;
  sgst: number | string;
  igst: number | string;
  total: number | string;
  status: string;
  notes: string | null;
};

// Shared by the admin export (/api/jobs/export, all jobs, admin-gated) and
// the per-client share link (/api/share/jobs/[token], one client's jobs,
// token-gated) so the two never drift into different-looking spreadsheets.
export async function buildJobsWorkbook(jobs: JobRow[], opts?: { hideClientColumn?: boolean; sheetTitle?: string }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'YAFT Designs';
  wb.created = new Date();

  const sheet = wb.addWorksheet(opts?.sheetTitle ?? 'Jobs', { views: [{ state: 'frozen', ySplit: 1 }] });

  const columns = [
    { header: 'Job No', key: 'job_no', width: 12 },
    { header: 'Date', key: 'job_date', width: 12 },
    ...(opts?.hideClientColumn ? [] : [{ header: 'Client', key: 'client_name', width: 26 }]),
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
  sheet.columns = columns;

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };

  const moneyCols = ['rate', 'cgst', 'sgst', 'igst', 'total'];

  jobs.forEach((j) => {
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

  if (jobs.length > 0) {
    const totalRow = sheet.addRow({
      job_no: '', job_date: '', client_name: '', job_type: '', qty: '',
      rate: 'TOTAL', gst_type: '', cgst: '', sgst: '', igst: '',
      total: jobs.reduce((s, j) => s + Number(j.total), 0),
      status: '', notes: '',
    });
    totalRow.font = { bold: true };
    totalRow.getCell('total').numFmt = '#,##0.00';
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
