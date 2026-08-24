import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type InvoiceLogEvent =
  | 'created'
  | 'queued'
  | 'recovered'
  | 'retry_failed'
  | 'edited'
  | 'payment_updated'
  | 'resent'
  | 'deleted'
  | 'restored'
  | 'scheduled_sent'
  | 'scheduled_send_failed'
  | 'send_cancelled'
  | 'converted';

/**
 * Records an invoice lifecycle event. Never throws -- logging must not
 * be able to break the actual operation it's describing. Uses its own
 * Supabase client rather than requiring the caller to pass one, since
 * several call sites (the retry-queue cron, the public /api/invoices
 * route) don't always have a convenient one already in scope with the
 * same lifetime.
 */
export async function logInvoiceEvent(params: {
  invoiceId?: string | null;
  invoiceNo: string;
  event: InvoiceLogEvent;
  message: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('invoice_logs').insert({
      invoice_id: params.invoiceId ?? null,
      invoice_no: params.invoiceNo,
      event:      params.event,
      message:    params.message,
      meta:       params.meta ?? {},
    });
  } catch (err) {
    console.error('[invoiceLog] failed to record event:', err);
  }
}
