// Extracts the video ID from any common YouTube URL format:
// - https://www.youtube.com/watch?v=VIDEOID
// - https://youtu.be/VIDEOID
// - https://www.youtube.com/embed/VIDEOID
// - https://www.youtube.com/shorts/VIDEOID
// Returns null if the string isn't a recognizable YouTube URL, so
// callers can fall back to treating it as "no video" rather than
// embedding something broken.
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const embedMatch = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
      if (embedMatch) return embedMatch[2];
    }

    return null;
  } catch {
    return null;
  }
}
