import type { SupabaseClient } from '@supabase/supabase-js';

// PostgREST puts `.in()` lists in the URL, so keep each request short.
const CHUNK = 50;

/**
 * Which of `ids` already have an email_logs row for `template`, matched on
 * `column` (job_id / invoice_id). One query per chunk instead of one count
 * query per id.
 *
 * Deliberately fails open per chunk, exactly like the per-id count queries it
 * replaces (a read error counted as "not sent yet"): a failed chunk yields no
 * ids rather than throwing.
 */
export async function loggedIds(
  supabase: SupabaseClient,
  template: string,
  column: 'job_id' | 'invoice_id',
  ids: string[],
): Promise<Set<string>> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase.from('email_logs').select(column).eq('template', template).in(column, chunk),
    ),
  );

  const found = new Set<string>();
  for (const { data } of results) {
    for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
      const id = row[column];
      if (id) found.add(id);
    }
  }
  return found;
}
