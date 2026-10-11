import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitShared } from '@/lib/rateLimitShared';
import { normalizeKey } from '@/lib/tortoiseLicense';

// POST /api/tortoise/license  { key, machine, product, version }
// Called by the Tortoise Rhino plugin. Answers { valid, expires, message }.
// Only a clear "no" returns valid:false (the plugin then drops the licence).
// Anything we are unsure about (DB trouble, missing config) returns 503 so the
// plugin keeps working on its offline grace period instead of locking a paying user.
export async function POST(request: NextRequest) {
  const limited = await rateLimitShared(request, 'tortoise-license', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const key = normalizeKey(body?.key);
  const machine = String(body?.machine ?? '').trim().slice(0, 64);
  if (key.length < 8 || key.length > 64 || !machine) {
    return NextResponse.json({ valid: false, message: 'Bad request.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[tortoise-license] SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json({ valid: false, message: 'Licence service unavailable.' }, { status: 503 });
  }

  const supabase = getSupabaseAdmin();
  // One atomic database call: checks status, expiry and the PC limit, and records the activation.
  const { data: res, error } = await supabase.rpc('tortoise_activate', { p_key: key, p_machine: machine });
  if (error || !res) {
    console.error('[tortoise-license] activate failed:', error);
    return NextResponse.json({ valid: false, message: 'Licence service unavailable.' }, { status: 503 });
  }
  const lic = { expires_at: (res.expires_at ?? null) as string | null, max_machines: Number(res.max_machines ?? 0) };
  switch (res.result) {
    case 'not_found': return NextResponse.json({ valid: false, message: 'Key not found.' });
    case 'revoked': return NextResponse.json({ valid: false, message: 'This licence has been revoked.' });
    case 'expired': return NextResponse.json({ valid: false, message: 'This licence has expired. Renew at yaftdesigns.com/tortoise' });
    case 'limit': return NextResponse.json({ valid: false, message: `This key is already used on ${lic.max_machines} PCs.` });
    case 'ok': break;
    default:
      console.error('[tortoise-license] unexpected result:', res.result);
      return NextResponse.json({ valid: false, message: 'Licence service unavailable.' }, { status: 503 });
  }

  return NextResponse.json({ valid: true, expires: lic.expires_at, message: 'OK' });
}
