import { getSupabaseAdmin } from '@/lib/supabase/admin';

const NAME = 'instagram';

type Stored = { token: string; expires_at: string | null } | null;

async function readStored(): Promise<Stored> {
  try {
    const { data } = await getSupabaseAdmin().from('integration_tokens').select('token, expires_at').eq('name', NAME).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

// Env values pasted into dashboards often carry quotes, spaces or a line break.
export function cleanToken(raw: string | undefined | null): string | undefined {
  const t = (raw ?? '').replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, '');
  return t || undefined;
}

// Newest usable token: the refreshed one in the database while it is still valid,
// otherwise the INSTAGRAM_ACCESS_TOKEN env var (the first seed, or a manual replacement).
export async function getInstagramToken(): Promise<string | undefined> {
  const stored = await readStored();
  if (stored && (!stored.expires_at || new Date(stored.expires_at).getTime() > Date.now())) return cleanToken(stored.token);
  return cleanToken(process.env.INSTAGRAM_ACCESS_TOKEN);
}

export type RefreshResult = { ok: true; expiresAt: string } | { ok: false; reason: string };

// Exchanges the current long-lived token for a fresh one (Instagram allows this once the
// token is at least 24h old and not yet expired) and stores it. Never returns the token.
export async function refreshInstagramToken(): Promise<RefreshResult> {
  const token = await getInstagramToken();
  if (!token) return { ok: false, reason: 'No Instagram token is set (INSTAGRAM_ACCESS_TOKEN is empty).' };
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || typeof json?.access_token !== 'string') {
      return { ok: false, reason: `Instagram refused the refresh (HTTP ${res.status}): ${String(json?.error?.message ?? 'unknown error').slice(0, 200)}` };
    }
    const expiresAt = new Date(Date.now() + Number(json.expires_in ?? 5_184_000) * 1000).toISOString();
    const { error } = await getSupabaseAdmin()
      .from('integration_tokens')
      .upsert({ name: NAME, token: json.access_token, expires_at: expiresAt, refreshed_at: new Date().toISOString() }, { onConflict: 'name' });
    if (error) return { ok: false, reason: `Refreshed but could not save the new token: ${error.message}` };
    return { ok: true, expiresAt };
  } catch (err) {
    return { ok: false, reason: `Refresh request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
