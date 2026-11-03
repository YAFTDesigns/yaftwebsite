// Creates a real Google Meet link per class by adding an event to the YAFT Google Calendar.
// Needs three env vars (one-time setup): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
// Optional: GOOGLE_CALENDAR_ID (defaults to the account's primary calendar).
// Events are created with no attendees and sendUpdates=none, so Google sends no emails.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL = 'https://www.googleapis.com/calendar/v3/calendars';

export const meetConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
const calId = () => encodeURIComponent((process.env.GOOGLE_CALENDAR_ID || 'primary').trim());

let cached: { token: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: process.env.GOOGLE_REFRESH_TOKEN!, grant_type: 'refresh_token' }),
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in failed (${j.error ?? r.status})`);
  cached = { token: j.access_token as string, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 };
  return cached.token;
}

async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(`${CAL}/${calId()}/events${path}`, {
    method,
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Calendar error ${r.status}: ${j?.error?.message ?? 'unknown'}`);
  return j;
}

const when = (iso: string) => ({ dateTime: iso, timeZone: 'Asia/Kolkata' });

/** One event, one unique Meet link. */
export async function createMeetEvent(o: { title: string; startIso: string; endIso: string; description?: string | null }): Promise<{ eventId: string; meetUrl: string }> {
  const j = await call('POST', '?conferenceDataVersion=1&sendUpdates=none', {
    summary: o.title,
    description: o.description || undefined,
    start: when(o.startIso),
    end: when(o.endIso),
    conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  });
  const meetUrl = (j.hangoutLink as string | undefined) ?? (j.conferenceData?.entryPoints ?? []).find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === 'video')?.uri;
  if (!j.id || !meetUrl) throw new Error('Google did not return a Meet link');
  return { eventId: j.id as string, meetUrl };
}

/** Best effort: keeps the calendar in step with the site. Never throws. */
export async function moveMeetEvent(eventId: string, startIso: string, endIso: string): Promise<void> {
  try { await call('PATCH', `/${encodeURIComponent(eventId)}?sendUpdates=none`, { start: when(startIso), end: when(endIso) }); } catch { /* calendar is a convenience */ }
}
export async function deleteMeetEvent(eventId: string): Promise<void> {
  try { await call('DELETE', `/${encodeURIComponent(eventId)}?sendUpdates=none`); } catch { /* already gone is fine */ }
}
