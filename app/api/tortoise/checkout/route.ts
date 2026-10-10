import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { createOrder } from '@/lib/razorpay';
import { priceFor, MAX_QUANTITY, type Currency } from '@/lib/tortoisePricing';

const EMAIL_RE = /^[^\s@<>,;"\\]+@[^\s@<>,;"\\]+\.[^\s@<>,;"\\]+$/;

// POST /api/tortoise/checkout { name, email, quantity, currency } -> Razorpay order for Checkout.js
export async function POST(request: NextRequest) {
  if (process.env.TORTOISE_CHECKOUT_ENABLED !== '1') {
    return NextResponse.json({ error: 'Online purchase is not open yet. Please email yaftdesigns@gmail.com.' }, { status: 503 });
  }
  const limited = rateLimit(request, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const quantity = Number(body?.quantity ?? 1);
  const currency: Currency | null = body?.currency === 'INR' || body?.currency === 'USD' ? body.currency : null;

  if (!name || name.length > 100) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
  if (!currency) return NextResponse.json({ error: 'Choose INR or USD.' }, { status: 400 });
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: `Quantity must be 1 to ${MAX_QUANTITY}.` }, { status: 400 });
  }

  const price = priceFor(currency, quantity);
  try {
    const order = await createOrder({
      amount: price.total,
      currency,
      receipt: `tort_${Date.now()}`,
      notes: { product: 'tortoise', name, email, quantity: String(quantity), base: String(price.base), gst: String(price.gst) },
    });
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[tortoise-checkout] order failed:', err);
    const msg = currency === 'USD'
      ? 'Could not start the USD payment. International payments may not be enabled yet, please email yaftdesigns@gmail.com.'
      : 'Could not start the payment. Please try again or email yaftdesigns@gmail.com.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
