/**
 * Upstash Redis queue for failed enquiries.
 * When Supabase is down, enquiries are pushed here and retried later.
 */

const QUEUE_KEY = 'yaft:enquiry_queue';

async function redis(command: string[]) {
  const url  = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash env vars not set');

  const res = await fetch(`${url}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export type QueuedEnquiry = {
  name: string;
  email: string;
  message: string;
  interest: string | null;
  queuedAt: string;
};

export async function pushEnquiryToQueue(enquiry: QueuedEnquiry): Promise<void> {
  await redis(['RPUSH', QUEUE_KEY, JSON.stringify(enquiry)]);
}

export async function popEnquiriesFromQueue(count = 10): Promise<QueuedEnquiry[]> {
  const results: QueuedEnquiry[] = [];
  for (let i = 0; i < count; i++) {
    const res = await redis(['LPOP', QUEUE_KEY]);
    if (!res.result) break;
    try {
      results.push(JSON.parse(res.result));
    } catch {
      // skip malformed entries
    }
  }
  return results;
}

export async function getQueueLength(): Promise<number> {
  const res = await redis(['LLEN', QUEUE_KEY]);
  return res.result ?? 0;
}

// ── Invoice queue ────────────────────────────────────────────────────
const INVOICE_QUEUE_KEY = 'yaft:invoice_queue';

export type QueuedInvoice = {
  invoice_no:   string;
  date:         string;
  client_name:  string;
  client_email: string;
  client_type:  string;
  client_company: string | null;
  client_pan:   string | null;
  client_gst:   string | null;
  client_state: string;
  client_address: string | null;
  client_phone:   string | null;
  items:        unknown;
  total:        number;
  advance:      number;
  balance:      number;
  invoice_type: string;
  queuedAt:     string;
};

export async function pushInvoiceToQueue(invoice: QueuedInvoice): Promise<void> {
  await redis(['RPUSH', INVOICE_QUEUE_KEY, JSON.stringify(invoice)]);
}

export async function popInvoicesFromQueue(count = 10): Promise<QueuedInvoice[]> {
  const results: QueuedInvoice[] = [];
  for (let i = 0; i < count; i++) {
    const res = await redis(['LPOP', INVOICE_QUEUE_KEY]);
    if (!res.result) break;
    try { results.push(JSON.parse(res.result)); } catch { /* skip */ }
  }
  return results;
}

export async function getInvoiceQueueLength(): Promise<number> {
  const res = await redis(['LLEN', INVOICE_QUEUE_KEY]);
  return res.result ?? 0;
}
