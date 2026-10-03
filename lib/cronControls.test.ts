import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCronControl } from './cronControls';

const fake = (result: { data: unknown; error: unknown } | 'throw'): SupabaseClient =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (result === 'throw') throw new Error('boom');
            return result;
          },
        }),
      }),
    }),
  }) as unknown as SupabaseClient;

describe('getCronControl fails closed', () => {
  it('missing row means disabled', async () => {
    expect((await getCronControl(fake({ data: null, error: null }), 'lead-follow-up')).enabled).toBe(false);
  });
  it('read error means disabled', async () => {
    expect((await getCronControl(fake({ data: null, error: { message: 'x' } }), 'lead-follow-up')).enabled).toBe(false);
  });
  it('thrown error means disabled', async () => {
    expect((await getCronControl(fake('throw'), 'lead-follow-up')).enabled).toBe(false);
  });
  it('only an explicit true enables, and approved emails are normalised', async () => {
    const c = await getCronControl(fake({ data: { job: 'lead-follow-up', enabled: true, max_total_sends: 5, approved_emails: [' A@X.com '] }, error: null }), 'lead-follow-up');
    expect(c.enabled).toBe(true);
    expect(c.approved_emails).toEqual(['a@x.com']);
    const off = await getCronControl(fake({ data: { job: 'x', enabled: 'true' }, error: null }), 'lead-follow-up');
    expect(off.enabled).toBe(false);
  });
});
