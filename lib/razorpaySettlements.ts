import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { razorpayConfig } from '@/lib/razorpay';

export type SettlementRow = {
  entity_id: string; type: string; settlement_id: string | null; settlement_utr: string | null; settled_at: string | null;
  amount_minor: number; fee_minor: number; tax_minor: number; credit_minor: number; test_mode: boolean;
};

type ReconItem = {
  entity_id?: string; type?: string; credit?: number; debit?: number; amount?: number; fee?: number; tax?: number;
  settled?: boolean; settled_at?: number | null; settlement_id?: string | null; settlement_utr?: string | null;
};

/** Pure: Razorpay recon items -> rows. Only items that really reached the bank (settled, with a settlement id) are kept. Amounts stay in paise. */
export function parseReconItems(items: ReconItem[], testMode: boolean): SettlementRow[] {
  const out: SettlementRow[] = [];
  for (const i of items ?? []) {
    if (!i?.entity_id || !i.settlement_id || i.settled === false) continue;
    out.push({
      entity_id: i.entity_id, type: i.type ?? 'payment', settlement_id: i.settlement_id, settlement_utr: i.settlement_utr ?? null,
      settled_at: i.settled_at ? new Date(i.settled_at * 1000).toISOString() : null,
      amount_minor: Math.round(i.amount ?? 0), fee_minor: Math.round(i.fee ?? 0), tax_minor: Math.round(i.tax ?? 0),
      credit_minor: Math.round((i.credit ?? 0) - (i.debit ?? 0)), test_mode: testMode,
    });
  }
  return out;
}

/** India date parts (UTC+5:30) for N days back; Razorpay's "day" is the settlement date. */
export function istDay(daysBack: number, now = new Date()) {
  const d = new Date(now.getTime() + 19800000 - daysBack * 86400000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

async function fetchDay(year: number, month: number, day: number, keyId: string, keySecret: string): Promise<ReconItem[]> {
  const all: ReconItem[] = [];
  for (let skip = 0; skip < 5000; skip += 500) {
    const res = await fetch(`https://api.razorpay.com/v1/settlements/recon/combined?year=${year}&month=${month}&day=${day}&count=500&skip=${skip}`, {
      headers: { authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Razorpay recon ${year}-${month}-${day}: ${json?.error?.description ?? `HTTP ${res.status}`}`);
    const items = (json?.items ?? []) as ReconItem[];
    all.push(...items);
    if (items.length < 500) break;
  }
  return all;
}

/** Pull the last `daysBack` settlement days from Razorpay and record them. Safe to re-run (upsert by payment id). Read-only on Razorpay. */
export async function syncSettlements(daysBack = 10): Promise<{ days: number; rows: number }> {
  const { keyId, keySecret, test } = razorpayConfig();
  if (!keyId || !keySecret) throw new Error('Razorpay is not configured');
  const a = getSupabaseAdmin();
  let rows = 0;
  for (let n = 0; n < daysBack; n++) {
    const { year, month, day } = istDay(n);
    const parsed = parseReconItems(await fetchDay(year, month, day, keyId, keySecret), test);
    if (!parsed.length) continue;
    const { error } = await a.from('razorpay_settlements').upsert(parsed.map((r) => ({ ...r, synced_at: new Date().toISOString() })), { onConflict: 'entity_id' });
    if (error) throw new Error(`Saving settlements failed: ${error.message}`);
    rows += parsed.length;
  }
  return { days: daysBack, rows };
}
