import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

// Public anon key — safe to hardcode, read-only by design
const DEFAULT_URL = 'https://rjvadqwqgqouihuydlnu.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdmFkcXdxZ3FvdWlodXlkbG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzU0NzMsImV4cCI6MjA5NzYxMTQ3M30.dqscfvLRLG-KOAv3fyMxT7vVD3wrC9xC-4JPVTYSC9c';

export function getSupabasePublic(): SupabaseClient {
  if (cached) return cached;
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? DEFAULT_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_KEY;
  cached = createClient(url, anonKey, { auth: { persistSession: false } });
  return cached;
}
