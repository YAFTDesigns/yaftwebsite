import { describe, it, expect, vi, afterEach } from 'vitest';
import { meetConfigured, createMeetEvent } from './googleMeet';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('googleMeet', () => {
  it('is off until all three keys are set', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'a'); vi.stubEnv('GOOGLE_CLIENT_SECRET', 'b'); vi.stubEnv('GOOGLE_REFRESH_TOKEN', '');
    expect(meetConfigured()).toBe(false);
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', 'c');
    expect(meetConfigured()).toBe(true);
  });
  it('creates an event with a Meet request and returns its link', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'a'); vi.stubEnv('GOOGLE_CLIENT_SECRET', 'b'); vi.stubEnv('GOOGLE_REFRESH_TOKEN', 'c');
    const calls: { url: string; body?: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { body?: unknown }) => {
      calls.push({ url, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
      return new Response(JSON.stringify({ id: 'ev1', hangoutLink: 'https://meet.google.com/abc-defg-hij' }), { status: 200 });
    }));
    const r = await createMeetEvent({ title: 'T', startIso: '2026-11-04T02:30:00.000Z', endIso: '2026-11-04T04:40:00.000Z' });
    expect(r).toEqual({ eventId: 'ev1', meetUrl: 'https://meet.google.com/abc-defg-hij' });
    const ev = calls.find((c) => c.url.includes('/events'))!;
    expect(ev.url).toContain('conferenceDataVersion=1');
    expect(ev.url).toContain('sendUpdates=none');
    expect(JSON.parse(ev.body!).conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
  });
});
