import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

// Only these in-site destinations are allowed after sign-in. Anything else (absolute URLs, //host, other paths) falls back to /admin,
// so the callback can never be turned into an open redirect.
const ALLOWED_NEXT = new Set(['/student', '/admin']);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '';
  const dest = ALLOWED_NEXT.has(next) ? next : '/admin';

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error && dest === '/student') return NextResponse.redirect(`${origin}/student?auth=failed`);
  }

  return NextResponse.redirect(`${origin}${dest}`);
}
