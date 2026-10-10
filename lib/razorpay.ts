import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verify Razorpay's X-Razorpay-Signature: hex HMAC-SHA256 of the RAW request body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.trim(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Create an order via the Razorpay REST API (no SDK needed). Throws on failure. */
export async function createOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.id) {
    const reason = json?.error?.description ?? `HTTP ${res.status}`;
    throw new Error(`Razorpay order failed: ${reason}`);
  }
  return json as RazorpayOrder;
}
