import ExcelJS from 'exceljs';
import { computeInvoiceTotals, type InvoiceLineItem } from './invoiceMath';
import { groupByMonth, monthLabel, ddmmyyyyToIso, type MinimalJob } from './jobsGrouping';

// Re-exported so existing importers (the export API route, tests) keep
// working -- the implementation itself now lives in jobsGrouping.ts,
// which has no exceljs dependency, so client components can use the
// date-parsing fix without bundling exceljs into the browser.
export { ddmmyyyyToIso };

export type InvoiceRow = {
  invoice_no: string;
  date: string;
  client_name: string;
  client_gst: string | null;
  client_state: string | null;
  invoice_type: string | null;
  items: InvoiceLineItem[];
  total: number | string;
  advance: number | string;
  balance: number | string;
};

const MONEY_COLS = ['subtotal', 'cgst', 'sgst', 'igst', 'total', 'advance', 'balance'];

const COLUMNS = [
  { header: 'Invoice No', key: 'invoice_no', width: 16 },
  { header: 'Date', key: 'date', width: 12 },
  { header: 'Client', key: 'client_name', width: 26 },
  { header: 'GSTIN', key: 'client_gst', width: 18 },
  { header: 'Type', key: 'invoice_type', width: 14 },
  { header: 'Subtotal (INR)', key: 'subtotal', width: 13 },
  { header: 'CGST', key: 'cgst', width: 10 },
  { header: 'SGST', key: 'sgst', width: 10 },
  { header: 'IGST', key: 'igst', width: 10 },
  { header: 'Total (INR)', key: 'total', width: 13 },
  { header: 'Advance (INR)', key: 'advance', width: 13 },
  { header: 'Balance Due (INR)', key: 'balance', width: 15 },
];

function fillInvoiceSheet(sheet: ExcelJS.Worksheet, invoices: InvoiceRow[]) {
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Tax breakdown is recomputed here rather than trusting a stored value
  // -- invoices only store the final total, never the CGST/SGST/IGST
  // split, so this is the same computeInvoiceTotals() call that
  // generated the original PDF, guaranteeing the sheet always agrees
  // with what the client was actually sent. Computed once per invoice
  // up front, reused for both its row and the sheet's totals row.
  const withTotals = invoices.map((inv) => ({ inv, totals: computeInvoiceTotals(inv.items ?? [], inv.client_state ?? '') }));

  withTotals.forEach(({ inv, totals }) => {
    const row = sheet.addRow({
      invoice_no: inv.invoice_no,
      date: inv.date,
      client_name: inv.client_name,
      client_gst: inv.client_gst || '',
      invoice_type: inv.invoice_type || '',
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: Number(inv.total),
      advance: Number(inv.advance) || 0,
      balance: Number(inv.balance) || 0,
    });
    MONEY_COLS.forEach((key) => { row.getCell(key).numFmt = '#,##0.00'; });

    if (Number(inv.balance) > 0) {
      row.getCell('balance').font = { color: { argb: 'FFE63946' }, bold: true };
    }
  });

  if (withTotals.length > 0) {
    const totalsRow = sheet.addRow({
      invoice_no: '', date: '', client_name: '', client_gst: '', invoice_type: 'TOTAL',
      subtotal: withTotals.reduce((s, { totals }) => s + totals.subtotal, 0),
      cgst: withTotals.reduce((s, { totals }) => s + totals.cgst, 0),
      sgst: withTotals.reduce((s, { totals }) => s + totals.sgst, 0),
      igst: withTotals.reduce((s, { totals }) => s + totals.igst, 0),
      total: withTotals.reduce((s, { inv }) => s + Number(inv.total), 0),
      advance: withTotals.reduce((s, { inv }) => s + (Number(inv.advance) || 0), 0),
      balance: withTotals.reduce((s, { inv }) => s + (Number(inv.balance) || 0), 0),
    });
    totalsRow.font = { bold: true };
    MONEY_COLS.forEach((key) => { totalsRow.getCell(key).numFmt = '#,##0.00'; });
  }
}

// One sheet per calendar month (most recent first), same layout Yokes'
// jobs export already uses -- built specifically so a full month or
// year of invoices can be handed to an auditor in one file, split the
// way books are normally organized.
//
// Unconfirmed proforma quotes (invoice_type 'proforma' with no advance
// received) are deliberately excluded from every month's revenue sheet
// and totals -- a quote nobody has paid toward isn't revenue. They're
// not dropped from the workbook entirely though: they land on their
// own "Pending Proforma" sheet at the end, still fully visible and
// tracked, just clearly separated from confirmed revenue so an
// auditor can't mistake one for the other.
// Whether an invoice counts as confirmed revenue -- shared with the
// email summary so the two can never disagree about what's "billed".
// Proforma quotes never count here, regardless of advance status --
// the "Convert to Invoice" action is the one true signal that a
// proforma became real, and that creates a genuine training/
// consultancy invoice row, which naturally passes this check on its
// own since it isn't type 'proforma' at all.
export function isConfirmedRevenue(inv: InvoiceRow): boolean {
  return inv.invoice_type !== 'proforma';
}

export async function buildInvoicesWorkbook(invoices: InvoiceRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'YAFT Designs';
  wb.created = new Date();

  const confirmed = invoices.filter(isConfirmedRevenue);
  const pendingProforma = invoices.filter((inv) => !isConfirmedRevenue(inv));

  const asMinimal: (InvoiceRow & MinimalJob)[] = confirmed.map((inv) => ({ ...inv, job_date: ddmmyyyyToIso(inv.date), job_type: '', total: inv.total }));
  const byMonth = groupByMonth(asMinimal);

  if (confirmed.length === 0) {
    fillInvoiceSheet(wb.addWorksheet('Invoices'), []);
  } else {
    [...byMonth.keys()].forEach((key) => {
      const sheet = wb.addWorksheet(monthLabel(key));
      fillInvoiceSheet(sheet, byMonth.get(key)! as InvoiceRow[]);
    });
  }

  if (pendingProforma.length > 0) {
    const sheet = wb.addWorksheet('Pending Proforma (Not in Revenue)');
    fillInvoiceSheet(sheet, pendingProforma);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
