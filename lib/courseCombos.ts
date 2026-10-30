// Pure helpers (no server imports) shared by the checkout page and the order API, so what the client sees is what is charged.
export type CatalogItem = { key: string; kind: 'course' | 'bundle'; title: string; feeInr: number; courseSlugs: string[]; description: string };

export type ComboResult = { items: CatalogItem[]; applied: { title: string; saving: number }[] };

/**
 * If the chosen single courses together contain every course of an active combo, the combo replaces them
 * at the combo fee, automatically. Only applied when it is actually cheaper. A course is used by at most one combo
 * (the one saving the most is applied first). Combos the client picked directly are left as they are.
 */
export function applyCombos(selected: CatalogItem[], catalog: CatalogItem[]): ComboResult {
  const chosenKeys = new Set(selected.map((i) => i.key));
  const singles = selected.filter((i) => i.kind === 'course');
  const bySlug = new Map(singles.map((i) => [i.courseSlugs[0], i]));
  const candidates = catalog
    .filter((b) => b.kind === 'bundle' && !chosenKeys.has(b.key) && b.courseSlugs.every((s) => bySlug.has(s)))
    .map((b) => ({ b, saving: b.courseSlugs.reduce((sum, s) => sum + bySlug.get(s)!.feeInr, 0) - b.feeInr }))
    .filter((c) => c.saving > 0)
    .sort((a, b) => b.saving - a.saving);
  const used = new Set<string>();
  const applied: { title: string; saving: number }[] = [];
  const replaced: CatalogItem[] = [];
  for (const { b, saving } of candidates) {
    if (b.courseSlugs.some((s) => used.has(s))) continue;
    b.courseSlugs.forEach((s) => used.add(s));
    replaced.push(b);
    applied.push({ title: b.title, saving });
  }
  const kept = selected.filter((i) => !(i.kind === 'course' && used.has(i.courseSlugs[0])));
  return { items: [...replaced, ...kept], applied };
}
