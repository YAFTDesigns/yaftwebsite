import { createHmac, timingSafeEqual } from 'node:crypto';

/** Verify Razorpay's X-Razorpay-Signature: hex HMAC-SHA256 of the RAW request body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.trim(), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Live vs test credentials. RAZORPAY_MODE=test switches to the RAZORPAY_TEST_* variables so live
 * keys never need to be overwritten for a test. Anything else (or unset) means live.
 */
export function razorpayConfig() {
  const test = process.env.RAZORPAY_MODE === 'test';
  return {
    test,
    keyId: test ? process.env.RAZORPAY_TEST_KEY_ID : process.env.RAZORPAY_KEY_ID,
    keySecret: test ? process.env.RAZORPAY_TEST_KEY_SECRET : process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: test ? process.env.RAZORPAY_TEST_WEBHOOK_SECRET : process.env.RAZORPAY_WEBHOOK_SECRET,
  };
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
  const { keyId, keySecret } = razorpayConfig();
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
