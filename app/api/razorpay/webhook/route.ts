import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyWebhookSignature, razorpayConfig } from '@/lib/razorpay';
import { newLicenseKey } from '@/lib/tortoiseLicense';
import { sendEmail, isEmailConfigured, escapeHtml, getNotificationBcc } from '@/lib/email';
import { createInvoiceForSale, sendBuyerKeyEmail, MAX_MACHINES_PER_KEY, type Sale } from '@/lib/tortoiseSale';

// POST /api/razorpay/webhook. Razorpay calls this; the signature is the only authentication.
export async function POST(request: NextRequest) {
  const { webhookSecret: secret, test: testMode } = razorpayConfig();
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'), secret)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad body' }, { status: 400 });
  }

  // Only captured payments for Tortoise matter; acknowledge everything else so Razorpay stops retrying.
  const pay = event.payload?.payment?.entity;
  if (event.event !== 'payment.captured' || !pay) return NextResponse.json({ ok: true, ignored: true });
  const notes = (pay.notes ?? {}) as Record<string, string>;
  if (notes.product !== 'tortoise') return NextResponse.json({ ok: true, ignored: true });

  const paymentId = String(pay.id ?? '');
  const email = String(notes.email || pay.email || '').trim().toLowerCase();
  const name = String(notes.name || '').slice(0, 100);
  const quantity = Math.min(Math.max(parseInt(notes.quantity ?? '1', 10) || 1, 1), 10);
  if (!paymentId || !email) return NextResponse.json({ error: 'Missing payment data' }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Idempotency: claim the payment first (payment_id is the primary key). A retried or
  // concurrent delivery hits the unique violation and does nothing.
  const autoEmail = process.env.TORTOISE_AUTO_EMAIL === '1';
  const { error: claimErr } = await supabase.from('tortoise_payments').insert({
    payment_id: paymentId,
    order_id: String(pay.order_id ?? ''),
    email, name,
    amount: Number(pay.amount ?? 0),
    currency: String(pay.currency ?? ''),
    quantity,
    buyer_state: notes.state || null,
    buyer_gstin: notes.gstin || null,
    test_mode: testMode,
    license_keys: [],
    customer_emailed: false,
  });
  if (claimErr) {
    if (claimErr.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    console.error('[razorpay-webhook] claim failed:', claimErr);
    return NextResponse.json({ error: 'DB error' }, { status: 500 }); // Razorpay will retry
  }

  const keys: string[] = [];
  for (let i = 0; i < quantity; i++) {
    const key = newLicenseKey();
    const { error } = await supabase.from('tortoise_licenses').insert({
      key, email, max_machines: MAX_MACHINES_PER_KEY, expires_at: null, note: `${testMode ? "TEST " : ""}Razorpay ${paymentId}`,
    });
    if (error) {
      console.error('[razorpay-webhook] licence insert failed:', error);
      // Roll back so the retry starts clean.
      if (keys.length) await supabase.from('tortoise_licenses').delete().in('key', keys);
      await supabase.from('tortoise_payments').delete().eq('payment_id', paymentId);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    keys.push(key);
  }
  await supabase.from('tortoise_payments').update({ license_keys: keys }).eq('payment_id', paymentId);

  // Everything below is best effort: the keys already exist and are visible in /admin/tortoise.
  const currency = String(pay.currency ?? '');
  const sale: Sale = {
    paymentId, name, email, quantity, amountMinor: Number(pay.amount ?? 0), currency,
    state: notes.state || null, gstin: notes.gstin || null, testMode, keys,
  };
  const alerts: string[] = [];
  let invoiceNo: string | null = null;
  if (currency === 'INR') {
    try {
      const inv = await createInvoiceForSale(sale);
      invoiceNo = inv.invoiceNo;
      if (inv.mismatch) alerts.push(`Invoice ${inv.invoiceNo} total differs from the amount paid. Check it in Admin > Invoices.`);
    } catch (invErr) {
      console.error('[razorpay-webhook] invoice failed:', invErr);
      alerts.push('The tax invoice could NOT be created automatically. Create it manually in Admin > Invoices.');
    }
  } else {
    alerts.push(`${currency} sale: no invoice is generated automatically. Raise an export invoice manually (confirm GST/LUT treatment with your CA).`);
  }

  if (isEmailConfigured()) {
    const keyList = keys.map((k) => `<li style="font-family:monospace;font-size:16px;">${escapeHtml(k)}</li>`).join('');
    const ownerTo = getNotificationBcc()[0] ?? 'yaftdesigns@gmail.com';
    try {
      if (autoEmail) {
        await sendBuyerKeyEmail({ ...sale, invoiceNo }, { bccOwner: true });
      } else {
        // Safe default: only tell the owner, who forwards the key after checking the payment.
        await sendEmail({
          to: ownerTo,
          subject: `${testMode ? '[TEST] ' : ''}Tortoise sale: ${email.replace(/[\r\n]+/g, ' ')}`,
          html: `<p>Payment ${escapeHtml(paymentId)} captured (${Number(pay.amount) / 100} ${escapeHtml(currency)}).</p>
<p>Buyer: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;${notes.state ? `, ${escapeHtml(notes.state)}` : ''}. Key${keys.length > 1 ? 's' : ''} created:</p><ul>${keyList}</ul>
<p>Auto-emailing to the buyer is OFF. Use Admin &gt; Tortoise &gt; Sales &gt; Resend to send the key${invoiceNo ? ' and invoice ' + escapeHtml(invoiceNo) : ''}.</p>`,
        });
      }
    } catch (mailErr) {
      console.error('[razorpay-webhook] email failed:', mailErr);
      alerts.push('The buyer email failed to send. Use Admin > Tortoise > Sales > Resend.');
    }
    if (alerts.length) {
      try {
        await sendEmail({
          to: ownerTo,
          subject: `${testMode ? '[TEST] ' : ''}Tortoise sale needs attention: ${paymentId}`,
          html: `<ul>${alerts.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul><p>Buyer: ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
        });
      } catch (e) { console.error('[razorpay-webhook] alert email failed:', e); }
    }
  }

  return NextResponse.json({ ok: true, keys: keys.length, invoice: invoiceNo });
}
