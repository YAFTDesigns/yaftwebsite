import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

// Public URL fallback — matches the value already used as a default in
// lib/supabase/public.ts. The service role key has no safe public fallback;
// if it's missing we still build a client with the anon key so reads that
// are allowed by RLS keep working instead of crashing the whole admin UI.
const DEFAULT_URL = 'https://rjvadqwqgqouihuydlnu.supabase.co';

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key. Admin writes that require elevated access will fail until this is configured in Vercel env vars.'
    );
  }

  cached = createClient(url, serviceKey, { auth: { persistSession: false } });
  return cached;
}
