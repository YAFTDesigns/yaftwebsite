import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from './lib/admin';
import { decideProxyAction, decideProxyActionNoAuthAvailable } from './lib/admin/proxyDecision';

function applyDecision(
  decision: ReturnType<typeof decideProxyAction>,
  request: NextRequest,
  fallback: NextResponse
): NextResponse {
  switch (decision.type) {
    case 'json-401':
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    case 'json-503':
      return NextResponse.json({ error: 'Auth check unavailable' }, { status: 503 });
    case 'redirect': {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = decision.to;
      return NextResponse.redirect(redirectUrl);
    }
    case 'pass-through':
      return fallback;
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return applyDecision(decideProxyActionNoAuthAvailable(pathname), request, response);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const authorized = isAdminEmail(user?.email);

  return applyDecision(decideProxyAction(pathname, authorized), request, response);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
