import { describe, it, expect } from 'vitest';
import type { PostgrestResponse } from '@supabase/supabase-js';
import { safeQuery, safeCount } from './safeQuery';

// These tests exist because every admin Server Component originally
// used `if (error) throw error`, which crashes the ENTIRE page on any
// single Supabase query failure — this was the root cause of the
// /admin 500 and the Sent Invoices silent-failure bugs found in
// production. safeQuery() is the single shared fix; these tests make
// sure it can never silently regress back to the unsafe pattern.

// Real PostgrestResponse requires several fields (status, statusText,
// etc.) that safeQuery/safeCount never actually read -- this mock only
// includes what they do read, cast through `unknown` rather than `any`
// since it's deliberately a partial shape, not an unknown one.
function mockResponse(partial: { data: unknown; error: { message: string } | null; count?: number | null }) {
  return Promise.resolve(partial as unknown as PostgrestResponse<unknown>);
}

describe('safeQuery', () => {
  it('returns real data and no error on success', async () => {
    const result = await safeQuery(
      mockResponse({ data: [1, 2, 3], error: null }),
      [],
      'success-case'
    );
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.error).toBeNull();
  });

  it('degrades to the fallback on a Postgrest error, preserving the message', async () => {
    const result = await safeQuery(
      mockResponse({
        data: null,
        error: { message: 'relation "x" does not exist' },
      }),
      [],
      'pg-error-case'
    );
    expect(result.data).toEqual([]);
    expect(result.error).toBe('relation "x" does not exist');
  });

  it('degrades to the fallback on a thrown exception, preserving the message', async () => {
    const result = await safeQuery(
      Promise.reject(new Error('network timeout')),
      [],
      'throw-case'
    );
    expect(result.data).toEqual([]);
    expect(result.error).toBe('network timeout');
  });

  it('falls back to the provided default when data is null with no error', async () => {
    const result = await safeQuery(
      mockResponse({ data: null, error: null }),
      'default',
      'null-data-case'
    );
    expect(result.data).toBe('default');
    expect(result.error).toBeNull();
  });

  it('NEVER throws — this is the entire point of the utility', async () => {
    // Even a maximally hostile rejection should never escape as a
    // thrown error from safeQuery itself.
    await expect(
      safeQuery(Promise.reject('not even an Error object'), [], 'hostile-case')
    ).resolves.not.toThrow();
  });
});

describe('safeCount', () => {
  it('returns the count on success', async () => {
    const result = await safeCount(
      mockResponse({ data: null, error: null, count: 42 }),
      'count-success'
    );
    expect(result.data).toBe(42);
    expect(result.error).toBeNull();
  });

  it('returns 0 and the error message on failure, not a thrown exception', async () => {
    const result = await safeCount(
      mockResponse({
        data: null,
        error: { message: 'permission denied' },
        count: null,
      }),
      'count-failure'
    );
    expect(result.data).toBe(0);
    expect(result.error).toBe('permission denied');
  });

  it('returns 0 when count is null with no error, not undefined or NaN', async () => {
    const result = await safeCount(
      mockResponse({ data: null, error: null, count: null }),
      'count-null'
    );
    expect(result.data).toBe(0);
  });
});
