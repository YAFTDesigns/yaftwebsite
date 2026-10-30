import { getSupabaseAdmin } from '@/lib/supabase/admin';

/** USD for an INR amount: INR total / rate, plus a small buffer for bank and gateway spread, rounded UP to a whole dollar. Cents out. */
export function usdMinorFor(inrTotal: number, inrPerUsd: number, bufferPercent: number): number {
  if (!(inrTotal > 0) || !(inrPerUsd > 0)) throw new Error('Bad amount or rate');
  const dollars = Math.ceil((inrTotal / inrPerUsd) * (1 + bufferPercent / 100) - 1e-9);
  return Math.max(1, dollars) * 100;
}

const SANE = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 30 && n < 300;

/** Frankfurter (ECB reference rates): { base: 'USD', rates: { INR: 83.1 } } */
export function parseFrankfurter(json: unknown): number | null {
  const v = (json as { rates?: { INR?: unknown } } | null)?.rates?.INR;
  return SANE(v) ? v : null;
}
/** open.er-api.com: { result: 'success', rates: { INR: 83.1 } } */
export function parseErApi(json: unknown): number | null {
  const j = json as { result?: string; rates?: { INR?: unknown } } | null;
  return j?.result === 'success' && SANE(j.rates?.INR) ? (j.rates!.INR as number) : null;
}

const PROVIDERS: { name: string; url: string; parse: (j: unknown) => number | null }[] = [
  { name: 'frankfurter', url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR', parse: parseFrankfurter },
  { name: 'er-api', url: 'https://open.er-api.com/v6/latest/USD', parse: parseErApi },
];

const FRESH_MS = 6 * 3600_000;   // fetch a new rate at most every 6 hours
const STALE_OK_MS = 7 * 24 * 3600_000; // if both providers are down, a rate up to 7 days old is still used

export const fxBufferPercent = () => {
  const n = Number(process.env.COURSE_FX_BUFFER_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : 2;
};

export type FxQuote = { inrPerUsd: number; source: string; fetchedAt: string; stale: boolean };

/** Current INR-per-USD rate, cached in the database. Returns null if no trustworthy rate exists (USD checkout is then switched off). */
export async function getInrPerUsd(now = Date.now()): Promise<FxQuote | null> {
  const supabase = getSupabaseAdmin();
  const { data: last } = await supabase.from('fx_rates').select('inr_per_usd, source, fetched_at').order('fetched_at', { ascending: false }).limit(1).maybeSingle();
  const lastAge = last ? now - new Date(last.fetched_at).getTime() : Infinity;
  if (last && lastAge < FRESH_MS) return { inrPerUsd: Number(last.inr_per_usd), source: last.source, fetchedAt: last.fetched_at, stale: false };

  for (const p of PROVIDERS) {
    try {
      const res = await fetch(p.url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const rate = p.parse(await res.json());
      if (rate === null) continue;
      await supabase.from('fx_rates').insert({ source: p.name, inr_per_usd: rate });
      return { inrPerUsd: rate, source: p.name, fetchedAt: new Date(now).toISOString(), stale: false };
    } catch (e) { console.error('[fx] provider failed:', p.name, String(e).slice(0, 120)); }
  }
  if (last && lastAge < STALE_OK_MS) return { inrPerUsd: Number(last.inr_per_usd), source: last.source, fetchedAt: last.fetched_at, stale: true };
  return null;
}
