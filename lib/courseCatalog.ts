import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type CatalogItem = { key: string; kind: 'course' | 'bundle'; title: string; feeInr: number; courseSlugs: string[]; description: string };
export const MAX_ITEMS = 6;

/** Courses and bundles that can be bought online: fee set by the admin, switched on, active. */
export async function loadCatalog(): Promise<CatalogItem[]> {
  const supabase = getSupabaseAdmin();
  const { data: courses } = await supabase.from('courses').select('slug, title, description, fee_inr, checkout_enabled, active').eq('active', true).eq('checkout_enabled', true).not('fee_inr', 'is', null);
  const { data: bundles } = await supabase.from('course_bundles').select('slug, title, description, course_slugs, fee_inr, active, sort').eq('active', true).order('sort', { ascending: true });
  const singles: CatalogItem[] = (courses ?? []).map((c) => ({ key: `course:${c.slug}`, kind: 'course', title: c.title, feeInr: Number(c.fee_inr), courseSlugs: [c.slug], description: c.description ?? '' }));
  const sellable = new Set(singles.map((s) => s.courseSlugs[0]));
  // A bundle is only offered if every course in it is itself on sale.
  const combos: CatalogItem[] = (bundles ?? []).filter((b) => (b.course_slugs as string[]).every((s) => sellable.has(s))).map((b) => ({ key: `bundle:${b.slug}`, kind: 'bundle', title: b.title, feeInr: Number(b.fee_inr), courseSlugs: b.course_slugs as string[], description: b.description ?? '' }));
  return [...combos, ...singles];
}

export type Selection = { ok: true; items: CatalogItem[]; baseTotal: number; description: string; courseSlugs: string[] } | { ok: false; error: string };

/** Turns the client's picks into a priced selection. Prices always come from the catalog, never from the browser. */
export function resolveSelection(catalog: CatalogItem[], keys: unknown): Selection {
  if (!Array.isArray(keys) || keys.length === 0) return { ok: false, error: 'Choose at least one course.' };
  const unique = [...new Set(keys.filter((k): k is string => typeof k === 'string'))];
  if (unique.length > MAX_ITEMS) return { ok: false, error: 'Too many items selected.' };
  const items: CatalogItem[] = [];
  for (const k of unique) {
    const it = catalog.find((c) => c.key === k);
    if (!it) return { ok: false, error: 'One of the selected courses is no longer available.' };
    items.push(it);
  }
  const seen = new Set<string>();
  for (const it of items) for (const s of it.courseSlugs) {
    if (seen.has(s)) return { ok: false, error: 'A course appears twice (for example on its own and inside a combo). Remove one.' };
    seen.add(s);
  }
  const baseTotal = items.reduce((s, i) => s + i.feeInr, 0);
  return { ok: true, items, baseTotal, description: items.map((i) => i.title).join(' + ').slice(0, 200), courseSlugs: [...seen] };
}

/** First payment of a two-part plan: half the fee, rounded down to a whole rupee. The balance is the exact remainder. */
export function advanceFor(baseTotal: number): number {
  return Math.max(1, Math.floor(baseTotal / 2));
}
