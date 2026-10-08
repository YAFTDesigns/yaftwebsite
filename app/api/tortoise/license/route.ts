import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { normalizeKey } from '@/lib/tortoiseLicense';

// POST /api/tortoise/license  { key, machine, product, version }
// Called by the Tortoise Rhino plugin. Answers { valid, expires, message }.
// Only a clear "no" returns valid:false (the plugin then drops the licence).
// Anything we are unsure about (DB trouble, missing config) returns 503 so the
// plugin keeps working on its offline grace period instead of locking a paying user.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 20, windowMs: 60_000 });
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
  const { data: lic, error } = await supabase
    .from('tortoise_licenses')
    .select('key, status, expires_at, max_machines')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('[tortoise-license] lookup failed:', error);
    return NextResponse.json({ valid: false, message: 'Licence service unavailable.' }, { status: 503 });
  }
  if (!lic) return NextResponse.json({ valid: false, message: 'Key not found.' });
  if (lic.status !== 'active') return NextResponse.json({ valid: false, message: 'This licence has been revoked.' });
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: 'This licence has expired. Renew at yaftdesigns.com/tortoise' });
  }

  const { data: acts, error: actErr } = await supabase
    .from('tortoise_activations')
    .select('machine')
    .eq('key', key);
  if (actErr) {
    console.error('[tortoise-license] activations failed:', actErr);
    return NextResponse.json({ valid: false, message: 'Licence service unavailable.' }, { status: 503 });
  }

  const known = (acts ?? []).some((a) => a.machine === machine);
  if (!known && (acts?.length ?? 0) >= lic.max_machines) {
    return NextResponse.json({ valid: false, message: `This key is already used on ${lic.max_machines} PCs.` });
  }

  const { error: upErr } = await supabase
    .from('tortoise_activations')
    .upsert({ key, machine, last_seen: new Date().toISOString() }, { onConflict: 'key,machine' });
  if (upErr) {
    console.error('[tortoise-license] upsert failed:', upErr);
    return NextResponse.json({ valid: false, message: 'Licence service unavailable.' }, { status: 503 });
  }

  return NextResponse.json({ valid: true, expires: lic.expires_at, message: 'OK' });
}
