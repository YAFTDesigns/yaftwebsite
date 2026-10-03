import { describe, it, expect, afterEach } from 'vitest';
import { isAuthorizedCron } from './cronAuth';

const req = (headers: Record<string, string>) => new Request('https://x.test/api/cron/a', { headers });

describe('isAuthorizedCron', () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('accepts the correct bearer token', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isAuthorizedCron(req({ authorization: 'Bearer s3cret' }))).toBe(true);
  });
  it('rejects a wrong or missing token', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isAuthorizedCron(req({ authorization: 'Bearer nope' }))).toBe(false);
    expect(isAuthorizedCron(req({}))).toBe(false);
  });
  it('rejects the spoofable x-vercel-cron header', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isAuthorizedCron(req({ 'x-vercel-cron': '1' }))).toBe(false);
  });
  it('refuses everything when CRON_SECRET is unset', () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCron(req({ authorization: 'Bearer ' }))).toBe(false);
    expect(isAuthorizedCron(req({ 'x-vercel-cron': '1' }))).toBe(false);
  });
});
