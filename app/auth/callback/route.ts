import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin';

// Only these in-site destinations are allowed after sign-in, so the callback can never be turned into an open redirect.
const ALLOWED_NEXT = new Set(['/student', '/admin', '/enroll']);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '';
  let dest = ALLOWED_NEXT.has(next) ? next : '';

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}${dest === '/admin' ? '/admin/login' : dest === '/enroll' ? '/enroll?auth=failed' : '/student?auth=failed'}`);
    // If the redirect lost its ?next (providers can drop it), decide by who signed in: admins go to /admin, everyone else to the student portal.
    if (!dest) {
      const { data } = await supabase.auth.getUser();
      dest = isAdminUser(data.user) ? '/admin' : '/student';
    }
  }

  // After registering from the enrol page, return to it with the chosen course kept (slug characters only).
  const course = searchParams.get('course') ?? '';
  const tail = dest === '/enroll' && /^[a-z0-9-]{1,80}$/.test(course) ? `?course=${course}` : '';
  return NextResponse.redirect(`${origin}${dest || '/admin'}${tail}`);
}
