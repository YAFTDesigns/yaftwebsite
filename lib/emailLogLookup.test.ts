import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loggedIds } from './emailLogLookup';

// Minimal fake of supabase.from('email_logs').select(col).eq('template', t).in(col, ids)
function fakeClient(rows: { template: string; job_id?: string; invoice_id?: string }[], opts: { failChunk?: number } = {}) {
  const calls: { template: string; column: string; ids: string[] }[] = [];
  const client = {
    from(table: string) {
      expect(table).toBe('email_logs');
      return {
        select(column: string) {
          return {
            eq(_col: string, template: string) {
              return {
                in(col: string, ids: string[]) {
                  calls.push({ template, column: col, ids });
                  if (opts.failChunk === calls.length - 1) {
                    return Promise.resolve({ data: null, error: { message: 'boom' } });
                  }
                  const data = rows
                    .filter((r) => r.template === template && ids.includes((r as Record<string, string>)[col]))
                    .map((r) => ({ [column]: (r as Record<string, string>)[col] }));
                  return Promise.resolve({ data, error: null });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('loggedIds', () => {
  it('returns only ids that have a log row for the template', async () => {
    const { client } = fakeClient([
      { template: 'testimonial_request', job_id: 'a' },
      { template: 'testimonial_request', job_id: 'c' },
      { template: 'other', job_id: 'b' },
    ]);
    const got = await loggedIds(client, 'testimonial_request', 'job_id', ['a', 'b', 'c', 'd']);
    expect([...got].sort()).toEqual(['a', 'c']);
  });

  it('does not query at all for an empty id list', async () => {
    const { client, calls } = fakeClient([]);
    const got = await loggedIds(client, 't', 'job_id', []);
    expect(got.size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('chunks long lists so no request carries more than 50 ids', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `id-${i}`);
    const rows = [{ template: 't', invoice_id: 'id-0' }, { template: 't', invoice_id: 'id-119' }];
    const { client, calls } = fakeClient(rows);
    const got = await loggedIds(client, 't', 'invoice_id', ids);
    expect(calls.map((c) => c.ids.length)).toEqual([50, 50, 20]);
    expect([...got].sort()).toEqual(['id-0', 'id-119']);
  });

  it('fails open per chunk: a failed read counts as "not sent", like the old per-id count', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `id-${i}`);
    const rows = ids.map((id) => ({ template: 't', job_id: id }));
    const { client } = fakeClient(rows, { failChunk: 0 });
    const got = await loggedIds(client, 't', 'job_id', ids);
    // first chunk (id-0..id-49) failed -> not reported; second chunk (id-50..id-59) is
    expect(got.size).toBe(10);
    expect(got.has('id-0')).toBe(false);
    expect(got.has('id-59')).toBe(true);
  });
});
