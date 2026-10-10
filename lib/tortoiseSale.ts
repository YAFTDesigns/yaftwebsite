import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computeInvoiceTotals, type InvoiceLineItem } from '@/lib/invoiceMath';
import { generatePDF, type InvoicePdfData } from '@/lib/invoicePdf';
import { sendEmail, escapeHtml, safeDisplayName, getNotificationBcc } from '@/lib/email';
import { logInvoiceEvent } from '@/lib/invoiceLog';
import { priceFor } from '@/lib/tortoisePricing';

export const MAX_MACHINES_PER_KEY = 2;

export type Sale = {
  paymentId: string;
  name: string;
  email: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  state: string | null;
  gstin: string | null;
  testMode: boolean;
  keys: string[];
};

function ddmmyyyy(d = new Date()): string {
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(ist.getUTCDate())}/${p(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()}`;
}

/** TOR-MMYYYY-NN for real sales; TOR-TEST-<payment suffix> for test-mode sales so the real series stays clean. */
async function nextInvoiceNo(sale: Sale): Promise<string> {
  if (sale.testMode) return `TOR-TEST-${sale.paymentId.slice(-8).toUpperCase()}`;
  const supabase = getSupabaseAdmin();
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const mmyyyy = String(ist.getUTCMonth() + 1).padStart(2, '0') + ist.getUTCFullYear();
  const { data } = await supabase.from('invoices').select('invoice_no').like('invoice_no', `TOR-${mmyyyy}-%`);
  const used = (data ?? []).map((r) => parseInt(String(r.invoice_no).split('-').pop() ?? '0', 10)).filter((n) => !Number.isNaN(n));
  return `TOR-${mmyyyy}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0')}`;
}

/** INR sales only. Saved as a paid-in-full tax invoice (not emailed here). Throws on failure. */
export async function createInvoiceForSale(sale: Sale): Promise<{ invoiceNo: string; invoiceId: string; mismatch: boolean }> {
  const supabase = getSupabaseAdmin();
  const state = sale.state || 'Tamil Nadu';
  const perKey = priceFor('INR', 1).base / 100;
  const items: InvoiceLineItem[] = [{
    desc: `Tortoise for Rhino: perpetual licence key (up to ${MAX_MACHINES_PER_KEY} PCs per key)`,
    qty: sale.quantity, rate: perKey,
  }];
  const totals = computeInvoiceTotals(items, state);
  const mismatch = Math.abs(totals.total * 100 - sale.amountMinor) > 50; // > 50 paise
  const invoiceNo = await nextInvoiceNo(sale);
  const { data, error } = await supabase.from('invoices').insert({
    invoice_no: invoiceNo,
    date: ddmmyyyy(),
    client_name: sale.name || sale.email,
    client_email: sale.email,
    client_type: sale.gstin ? 'company' : 'individual',
    client_gst: sale.gstin,
    client_state: state,
    items,
    total: totals.total,
    advance: totals.total,
    balance: 0,
    invoice_type: sale.testMode ? 'test' : 'software',
    status: 'draft',
  }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'invoice insert failed');
  await supabase.from('tortoise_payments').update({ invoice_no: invoiceNo }).eq('payment_id', sale.paymentId);
  await logInvoiceEvent({
    invoiceId: data.id, invoiceNo, event: 'created',
    message: `Auto-created for Tortoise payment ${sale.paymentId}, INR ${totals.total.toLocaleString('en-IN')}${sale.testMode ? ' (TEST)' : ''}`,
  });
  return { invoiceNo, invoiceId: data.id, mismatch };
}

async function invoicePdfFor(invoiceNo: string): Promise<{ pdf: string; filename: string; invoiceId: string } | null> {
  const { data: inv } = await getSupabaseAdmin().from('invoices').select('*').eq('invoice_no', invoiceNo).is('deleted_at', null).maybeSingle();
  if (!inv) return null;
  const pdfData: InvoicePdfData = {
    invoice_no: inv.invoice_no, date: inv.date, invoice_type: inv.invoice_type,
    client_name: inv.client_name, client_email: inv.client_email, client_type: inv.client_type,
    client_company: inv.client_company, client_pan: inv.client_pan, client_gst: inv.client_gst,
    client_state: inv.client_state, client_address: inv.client_address, client_phone: inv.client_phone,
    items: inv.items ?? [], advance: inv.advance, balance: inv.balance,
  };
  const buf = await generatePDF(pdfData);
  return { pdf: buf.toString('base64'), filename: `YAFT_Invoice_${inv.invoice_no}.pdf`, invoiceId: inv.id };
}

const inr = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The buyer's key email. Attaches the tax invoice for INR sales. Throws if sending fails. */
export async function sendBuyerKeyEmail(s: Sale & { invoiceNo: string | null }, opts: { bccOwner: boolean }): Promise<void> {
  const keyList = s.keys.map((k) => `<li style="font-family:monospace;font-size:17px;letter-spacing:1px;margin:6px 0;">${escapeHtml(k)}</li>`).join('');
  const plural = s.keys.length > 1;
  const isInr = s.currency === 'INR';
  const paid = isInr ? `INR ${inr(s.amountMinor / 100)} (including 18% GST)` : `USD ${(s.amountMinor / 100).toFixed(2)}`;

  const attachments: { filename: string; content: string }[] = [];
  let invoiceId: string | null = null;
  if (isInr && s.invoiceNo) {
    const inv = await invoicePdfFor(s.invoiceNo);
    if (inv) { attachments.push({ filename: inv.filename, content: inv.pdf }); invoiceId = inv.invoiceId; }
  }

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
<p style="font-size:14px;line-height:1.8;">Hi ${escapeHtml(s.name || 'there')},</p>
<p style="font-size:14px;line-height:1.8;">Thank you for buying Tortoise. Your licence key${plural ? 's are' : ' is'} below.</p>
<ul style="list-style:none;padding:14px 18px;background:#f6f6f6;border-radius:8px;margin:16px 0;">${keyList}</ul>
<p style="font-size:14px;line-height:1.8;margin:0 0 6px;"><strong>To activate</strong></p>
<ol style="font-size:14px;line-height:1.8;margin:0 0 16px;padding-left:20px;">
<li>Open Rhino 8 and run Tortoise.</li>
<li>Go to <strong>About / Help &gt; Licence</strong>.</li>
<li>Paste the key and confirm.</li>
</ol>
<p style="font-size:13px;line-height:1.7;color:#444;">Each key works on up to ${MAX_MACHINES_PER_KEY} PCs, never expires, and is checked online now and then (it keeps working offline for up to 30 days between checks). To move a key to a new PC, just email us.</p>
<p style="font-size:13px;line-height:1.7;color:#444;">Payment received: ${escapeHtml(paid)}, ${s.quantity} key${s.quantity > 1 ? 's' : ''}. Payment ref ${escapeHtml(s.paymentId)}.${attachments.length ? ' Your tax invoice is attached.' : ''}${!isInr ? ' This email is your receipt; email us if you need an invoice for your records.' : ''}</p>
<p style="font-size:13px;line-height:1.7;color:#444;">Questions or a bug to report? Just reply to this email.</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0 14px;">
<p style="font-size:12px;color:#888;margin:0;line-height:1.7;">YAFT Designs &middot; Authorized Rhino Training Center &middot; Coimbatore, India<br><a href="https://www.yaftdesigns.com/tortoise" style="color:#E63946;text-decoration:none;">yaftdesigns.com/tortoise</a></p>
</div>`;

  const to = `${safeDisplayName(s.name) || 'there'} <${s.email}>`;
  const subject = `${s.testMode ? '[TEST] ' : ''}Your Tortoise licence key${plural ? 's' : ''}`;
  const supabase = getSupabaseAdmin();
  let result: { id?: string | null } | undefined;
  try {
    result = await sendEmail({ to, subject, html, bcc: opts.bccOwner ? getNotificationBcc() : undefined, attachments });
  } catch (err) {
    await supabase.from('email_logs').insert({ to_email: s.email, to_name: s.name, subject, template: 'tortoise_key', status: 'failed', error: String(err).slice(0, 300) });
    throw err;
  }
  await supabase.from('email_logs').insert({ to_email: s.email, to_name: s.name, subject, template: 'tortoise_key', status: 'sent', resend_email_id: result?.id ?? null });
  await supabase.from('tortoise_payments').update({ customer_emailed: true }).eq('payment_id', s.paymentId);
  if (invoiceId) {
    await supabase.from('invoices').update({ email_sent_at: new Date().toISOString(), status: 'sent' }).eq('id', invoiceId);
    await logInvoiceEvent({ invoiceId, invoiceNo: s.invoiceNo!, event: 'created', message: `Invoice emailed to ${s.email} with licence key${plural ? 's' : ''}` });
  }
}
