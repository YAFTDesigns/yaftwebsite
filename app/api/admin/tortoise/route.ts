import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addMonths, newLicenseKey, normalizeKey } from '@/lib/tortoiseLicense';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { sendBuyerKeyEmail } from '@/lib/tortoiseSale';

// Covered by the proxy matcher (/api/admin/:path*), so only logged-in admins reach it.

// GET /api/admin/tortoise  -> licences with how many PCs each is used on
export async function GET(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (new URL(request.url).searchParams.get('view') === 'sales') {
    const { data, error: salesErr } = await supabase.from('tortoise_payments').select('*').order('created_at', { ascending: false }).limit(500);
    if (salesErr) {
      console.error('[tortoise-admin] sales GET failed:', salesErr);
      return NextResponse.json({ error: 'Could not load sales' }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] });
  }
  const { data: lics, error } = await supabase
    .from('tortoise_licenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[tortoise-admin] GET failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data: acts } = await supabase.from('tortoise_activations').select('key, last_seen');
  const stats = new Map<string, { n: number; last: string }>();
  for (const a of acts ?? []) {
    const s = stats.get(a.key) ?? { n: 0, last: '' };
    s.n += 1;
    if (a.last_seen > s.last) s.last = a.last_seen;
    stats.set(a.key, s);
  }
  return NextResponse.json({
    data: (lics ?? []).map((l) => ({ ...l, machines: stats.get(l.key)?.n ?? 0, last_seen: stats.get(l.key)?.last ?? null })),
  });
}

// POST /api/admin/tortoise  { email, months (0 = perpetual), max_machines, note }
export async function POST(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);

  // Resend the key email (with the invoice for INR sales) for an existing payment.
  if (body?.action === 'resend_key_email') {
    const supabase = getSupabaseAdmin();
    const { data: p } = await supabase.from('tortoise_payments').select('*').eq('payment_id', String(body.payment_id ?? '')).maybeSingle();
    if (!p || !p.license_keys?.length) return NextResponse.json({ error: 'Payment not found or has no keys' }, { status: 404 });
    try {
      await sendBuyerKeyEmail({
        paymentId: p.payment_id, name: p.name ?? '', email: p.email, quantity: p.quantity,
        amountMinor: p.amount, currency: p.currency, state: p.buyer_state, gstin: p.buyer_gstin,
        testMode: !!p.test_mode, keys: p.license_keys, invoiceNo: p.invoice_no,
      }, { bccOwner: true });
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[tortoise-admin] resend failed:', err);
      return NextResponse.json({ error: 'Email failed to send' }, { status: 502 });
    }
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  const months = Number(body?.months ?? 12);
  const maxMachines = Number(body?.max_machines ?? 2);
  const note = String(body?.note ?? '').trim().slice(0, 200) || null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Valid email needed' }, { status: 400 });
  if (!Number.isInteger(months) || months < 0 || months > 120) return NextResponse.json({ error: 'Months must be 0 to 120' }, { status: 400 });
  if (!Number.isInteger(maxMachines) || maxMachines < 1 || maxMachines > 50) return NextResponse.json({ error: 'PCs must be 1 to 50' }, { status: 400 });

  const key = newLicenseKey();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('tortoise_licenses').insert({
    key,
    email,
    note,
    max_machines: maxMachines,
    expires_at: months === 0 ? null : addMonths(new Date(), months).toISOString(),
  });
  if (error) {
    console.error('[tortoise-admin] POST failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, key });
}

// PATCH /api/admin/tortoise  { key, action: 'revoke' | 'restore' | 'reset' | 'extend', months }
export async function PATCH(request: NextRequest) {
  if (!(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const key = normalizeKey(body?.key);
  const action = body?.action;
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  let error: { message: string } | null = null;

  if (action === 'revoke' || action === 'restore') {
    ({ error } = await supabase.from('tortoise_licenses').update({ status: action === 'revoke' ? 'revoked' : 'active' }).eq('key', key));
  } else if (action === 'reset') {
    ({ error } = await supabase.from('tortoise_activations').delete().eq('key', key));
  } else if (action === 'extend') {
    const months = Number(body?.months ?? 12);
    if (!Number.isInteger(months) || months < 1 || months > 120) return NextResponse.json({ error: 'Months must be 1 to 120' }, { status: 400 });
    const { data: lic, error: readErr } = await supabase.from('tortoise_licenses').select('expires_at').eq('key', key).maybeSingle();
    if (readErr || !lic) return NextResponse.json({ error: readErr?.message ?? 'Key not found' }, { status: readErr ? 500 : 404 });
    if (lic.expires_at === null) return NextResponse.json({ error: 'Licence is perpetual' }, { status: 400 });
    // extend from the later of now and the current expiry
    const base = new Date(Math.max(Date.now(), new Date(lic.expires_at).getTime()));
    ({ error } = await supabase.from('tortoise_licenses').update({ expires_at: addMonths(base, months).toISOString() }).eq('key', key));
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (error) {
    console.error('[tortoise-admin] PATCH failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
