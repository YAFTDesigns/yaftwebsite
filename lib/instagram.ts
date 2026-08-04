export type InstagramMedia = {
  id: string;
  caption: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
};

const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

/**
 * Fetches the account's most recent media. Returns an empty array on any
 * failure (missing token, expired token, network issue) rather than
 * throwing, callers should treat an empty feed as "nothing to show" and
 * fail quietly, this is a homepage/projects-page decoration, not
 * something that should ever break page render.
 */
export async function getInstagramMedia(limit = 8): Promise<InstagramMedia[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];

  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me/media?fields=${FIELDS}&limit=${limit}&access_token=${token}`,
      { next: { revalidate: 3600 } } // real content, but no need to refetch more than hourly
    );
    if (!res.ok) {
      console.error('[instagram] fetch failed:', res.status, await res.text());
      return [];
    }
    const json = await res.json();
    const items = Array.isArray(json.data) ? json.data : [];

    return items.map((item: any) => ({
      id: item.id,
      caption: item.caption ?? null,
      mediaType: item.media_type,
      // Videos/reels only expose thumbnail_url; images expose media_url directly.
      thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
      permalink: item.permalink,
      timestamp: item.timestamp,
    }));
  } catch (err) {
    console.error('[instagram] fetch threw:', err);
    return [];
  }
}
