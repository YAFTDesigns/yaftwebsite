import ExcelJS from 'exceljs';
import { groupByMonth, monthLabel, revenueByType, revenueByMonth, STATUS_COLORS_HEX } from './jobsGrouping';

const GST_LABEL: Record<string, string> = { intra: 'Intra-state (CGST+SGST)', inter: 'Inter-state (IGST)', none: 'No GST' };

// Excel ARGB fills, derived from the single hex color source in
// jobsGrouping.ts (strip '#', prepend full-opacity alpha) so the exported
// sheet and every in-browser view stay in sync by construction.
export const STATUS_FILL: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_COLORS_HEX).map(([status, hex]) => [status, `FF${hex.slice(1)}`])
);

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
  status_date?: string | null; // when the job last entered its current status
};

const COLUMNS = (hideClientColumn: boolean) => [
  { header: 'Job No', key: 'job_no', width: 12 },
  { header: 'Date', key: 'job_date', width: 12 },
  ...(hideClientColumn ? [] : [{ header: 'Client', key: 'client_name', width: 26 }]),
  { header: 'Job Type', key: 'job_type', width: 18 },
  { header: 'Qty', key: 'qty', width: 8 },
  { header: 'Rate (INR)', key: 'rate', width: 12 },
  { header: 'GST Type', key: 'gst_type', width: 22 },
  { header: 'CGST', key: 'cgst', width: 10 },
  { header: 'SGST', key: 'sgst', width: 10 },
  { header: 'IGST', key: 'igst', width: 10 },
  { header: 'Total (INR)', key: 'total', width: 13 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Status Date', key: 'status_date', width: 14 },
  { header: 'Notes', key: 'notes', width: 30 },
];

const MONEY_COLS = ['rate', 'cgst', 'sgst', 'igst', 'total'];

function fillJobsSheet(sheet: ExcelJS.Worksheet, jobs: JobRow[], hideClientColumn: boolean) {
  sheet.columns = COLUMNS(hideClientColumn);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

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
      status_date: j.status_date ? new Date(j.status_date).toLocaleDateString('en-IN') : '',
      notes: j.notes || '',
    });
    MONEY_COLS.forEach((key) => { row.getCell(key).numFmt = '#,##0.00'; });

    const fillColor = STATUS_FILL[j.status];
    if (fillColor) {
      const statusCell = row.getCell('status');
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      statusCell.alignment = { horizontal: 'center' };
    }
  });

  if (jobs.length > 0) {
    const totalRow = sheet.addRow({
      job_no: '', job_date: '', client_name: '', job_type: '', qty: '',
      rate: 'TOTAL', gst_type: '', cgst: '', sgst: '', igst: '',
      total: jobs.reduce((s, j) => s + Number(j.total), 0),
      status: '', status_date: '', notes: '',
    });
    totalRow.font = { bold: true };
    totalRow.getCell('total').numFmt = '#,##0.00';
  }
}

// Shared by the admin export (/api/jobs/export, all jobs, admin-gated) and
// the per-client share link (/api/share/jobs/[token], one client's jobs,
// token-gated) so the two never drift into different-looking spreadsheets.
//
// Layout: an optional Summary sheet first (revenue by job type, revenue by
// month -- "what earns me more"), then one sheet per calendar month found
// in the data, most recent first, each with its own subtotal row.
export async function buildJobsWorkbook(
  jobs: JobRow[],
  opts?: { hideClientColumn?: boolean; includeSummary?: boolean }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'YAFT Designs';
  wb.created = new Date();

  const hideClientColumn = !!opts?.hideClientColumn;
  const includeSummary = opts?.includeSummary !== false;

  const byMonth = groupByMonth(jobs);

  if (includeSummary && jobs.length > 0) {
    const summary = wb.addWorksheet('Summary');
    summary.getColumn(1).width = 24;
    summary.getColumn(2).width = 16;
    summary.getColumn(3).width = 16;

    let r = 1;
    const heading = (text: string) => {
      const cell = summary.getCell(`A${r}`);
      cell.value = text;
      cell.font = { bold: true, size: 13 };
      r += 1;
    };
    const tableHeader = (cols: string[]) => {
      cols.forEach((c, i) => {
        const cell = summary.getCell(r, i + 1);
        cell.value = c;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      });
      r += 1;
    };

    heading('Revenue by Job Type');
    tableHeader(['Job Type', 'Jobs', 'Total (INR)']);
    revenueByType(jobs).forEach((row) => {
      summary.getCell(r, 1).value = row.type;
      summary.getCell(r, 2).value = row.count;
      const cell = summary.getCell(r, 3);
      cell.value = row.total;
      cell.numFmt = '#,##0.00';
      r += 1;
    });
    r += 2;

    heading('Revenue by Month');
    tableHeader(['Month', 'Jobs', 'Total (INR)']);
    revenueByMonth(jobs).forEach((row) => {
      summary.getCell(r, 1).value = row.label;
      summary.getCell(r, 2).value = row.count;
      const cell = summary.getCell(r, 3);
      cell.value = row.total;
      cell.numFmt = '#,##0.00';
      r += 1;
    });
    r += 2;

    const grandCell = summary.getCell(r, 1);
    grandCell.value = 'GRAND TOTAL';
    grandCell.font = { bold: true };
    const grandTotal = summary.getCell(r, 3);
    grandTotal.value = jobs.reduce((s, j) => s + Number(j.total), 0);
    grandTotal.numFmt = '#,##0.00';
    grandTotal.font = { bold: true };
  }

  if (jobs.length === 0) {
    const sheet = wb.addWorksheet('Jobs');
    fillJobsSheet(sheet, [], hideClientColumn);
  } else {
    [...byMonth.keys()].forEach((key) => {
      const sheet = wb.addWorksheet(monthLabel(key));
      fillJobsSheet(sheet, byMonth.get(key)!, hideClientColumn);
    });
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
