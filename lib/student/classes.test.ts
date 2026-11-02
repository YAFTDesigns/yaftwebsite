import { describe, it, expect } from 'vitest';
import { stateOf, cleanMeetUrl, cleanHttps } from './classes';

describe('class join window', () => {
  const start = '2026-11-10T10:00:00Z', end = '2026-11-10T11:30:00Z';
  const at = (iso: string) => new Date(iso).getTime();
  it('is upcoming before the window', () => expect(stateOf(start, end, at('2026-11-10T09:30:00Z'))).toBe('upcoming'));
  it('opens 15 minutes before start', () => expect(stateOf(start, end, at('2026-11-10T09:45:00Z'))).toBe('open'));
  it('stays open 30 minutes after end', () => expect(stateOf(start, end, at('2026-11-10T12:00:00Z'))).toBe('open'));
  it('is past after that', () => expect(stateOf(start, end, at('2026-11-10T12:01:00Z'))).toBe('past'));
});
describe('link cleaning', () => {
  it('accepts meet, zoom, teams over https', () => {
    expect(cleanMeetUrl('https://meet.google.com/abc-defg-hij')).toContain('meet.google.com');
    expect(cleanMeetUrl('https://us02web.zoom.us/j/123')).toContain('zoom.us');
  });
  it('rejects other hosts, http and junk', () => {
    expect(cleanMeetUrl('http://meet.google.com/x')).toBeNull();
    expect(cleanMeetUrl('https://evil.example.com/meet.google.com')).toBeNull();
    expect(cleanMeetUrl('javascript:alert(1)')).toBeNull();
    expect(cleanHttps('ftp://x')).toBeNull();
  });
});
