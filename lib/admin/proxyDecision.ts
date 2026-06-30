export type ProxyDecision =
  | { type: 'json-401' }
  | { type: 'json-503' }
  | { type: 'redirect'; to: string }
  | { type: 'pass-through' };

/**
 * The core authorization decision for the admin proxy, extracted as a
 * pure function so it can be unit tested directly — see proxy.test.ts.
 *
 * proxy.ts itself just calls this and translates the result into the
 * actual NextResponse. Keeping the decision logic here, separate from
 * the Supabase client setup and cookie handling, is what makes it
 * possible to test the access-control matrix without mocking a real
 * request/response cycle.
 */
export function decideProxyAction(pathname: string, authorized: boolean): ProxyDecision {
  const isLoginPage = pathname === '/admin/login';
  const isApiRoute = pathname.startsWith('/api/admin/');

  if (isApiRoute && !authorized) {
    return { type: 'json-401' };
  }
  if (!isApiRoute && !isLoginPage && !authorized) {
    return { type: 'redirect', to: '/admin/login' };
  }
  if (isLoginPage && authorized) {
    return { type: 'redirect', to: '/admin' };
  }
  return { type: 'pass-through' };
}

/**
 * Decision for the case where Supabase env vars are missing entirely,
 * so we can't even check who's asking. Fails closed for API routes
 * (they proxy to service-role-backed endpoints — refusing is safer
 * than silently letting an unverifiable request through) and fails
 * open for page routes (blocking the whole site over a config issue
 * would be its own outage, and pages don't expose elevated-privilege
 * data directly the way these API routes do).
 */
export function decideProxyActionNoAuthAvailable(pathname: string): ProxyDecision {
  const isApiRoute = pathname.startsWith('/api/admin/');
  return isApiRoute ? { type: 'json-503' } : { type: 'pass-through' };
}
