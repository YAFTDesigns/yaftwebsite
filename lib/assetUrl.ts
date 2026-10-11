// Static assets live in Supabase Storage, not in public/ (keeps every deployment small).
// Pure string building, so it is safe in server and client components alike.
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rjvadqwqgqouihuydlnu.supabase.co'}/storage/v1/object/public`;

/** `site-images` bucket: images/ under the old public/assets. */
export const imageUrl = (path: string) => `${BASE}/site-images/${encodeURI(path)}`;

/** `public-assets` bucket: video/, pdfs/, partners/, docs/ and point1.obj. */
export const assetUrl = (path: string) => `${BASE}/public-assets/${encodeURI(path)}`;

/**
 * DB rows seeded before the move may still hold a local `/assets/...` path.
 * Maps those to their bucket URL; any other value is returned unchanged.
 */
export function localAssetToUrl(path: string): string {
  const m = path.match(/^\/assets\/(images|video|pdfs|partners|docs)\/(.+)$/);
  if (!m) return path;
  return m[1] === 'images' ? imageUrl(m[2]) : assetUrl(`${m[1]}/${m[2]}`);
}
