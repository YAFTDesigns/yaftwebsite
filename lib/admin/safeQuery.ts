import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

/**
 * Wraps a Supabase query so that a failure (missing table, RLS block,
 * network blip, schema mismatch, etc.) degrades to a typed fallback
 * value instead of throwing and crashing the whole page.
 *
 * This exists because every admin Server Component used to do:
 *
 *   const { data, error } = await supabase.from('x').select(...);
 *   if (error) throw error;
 *
 * which takes down the ENTIRE page on any single query failure, with
 * no partial rendering and no visible reason why — this was the root
 * cause of the /admin 500 and the Sent Invoices "load failure was
 * silently swallowed" bugs. Every admin data-fetching function should
 * route through this instead of handling errors ad-hoc per page.
 *
 * Usage:
 *   const leads = await safeQuery(
 *     supabase.from('leads').select('*'),
 *     [],
 *     'leads list'
 *   );
 *   // leads is always an array — [] on failure, with the error logged
 *   // server-side and available via leads.error if the caller wants
 *   // to surface it in the UI.
 */
export type SafeResult<T> = {
  data: T;
  error: string | null;
};

export async function safeQuery<T>(
  promise: PromiseLike<PostgrestResponse<any> | PostgrestSingleResponse<any>>,
  fallback: T,
  label: string
): Promise<SafeResult<T>> {
  try {
    const res = await promise;
    if (res.error) {
      console.error(`[safeQuery:${label}] query failed:`, res.error.message ?? res.error);
      return { data: fallback, error: res.error.message ?? 'Query failed' };
    }
    return { data: (res.data as T) ?? fallback, error: null };
  } catch (err: any) {
    console.error(`[safeQuery:${label}] threw:`, err?.message ?? err);
    return { data: fallback, error: err?.message ?? 'Unexpected error' };
  }
}

/**
 * Same as safeQuery but for count-only queries (head: true),
 * returning a number instead of an array.
 */
export async function safeCount(
  promise: PromiseLike<PostgrestResponse<any> | PostgrestSingleResponse<any>>,
  label: string
): Promise<SafeResult<number>> {
  try {
    const res = await promise;
    if (res.error) {
      console.error(`[safeCount:${label}] query failed:`, res.error.message ?? res.error);
      return { data: 0, error: res.error.message ?? 'Query failed' };
    }
    return { data: res.count ?? 0, error: null };
  } catch (err: any) {
    console.error(`[safeCount:${label}] threw:`, err?.message ?? err);
    return { data: 0, error: err?.message ?? 'Unexpected error' };
  }
}
