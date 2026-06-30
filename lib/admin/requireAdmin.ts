import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

/**
 * Checks whether the current request comes from a logged-in admin,
 * by reading the same session cookie the proxy uses for /admin/* and
 * /api/admin/* routes.
 *
 * Use this directly inside any API route handler that is admin-only
 * but does NOT live under /api/admin/ — such as /api/invoices, whose
 * URL is shaped like a public endpoint but is only ever called from
 * the admin invoices page. The proxy's matcher (/api/admin/:path*)
 * does not cover routes like this, so without this explicit check
 * they would be reachable by anyone with zero authentication.
 *
 * Returns true if authorized, false otherwise. Does not throw —
 * callers should check the boolean and return their own 401 response,
 * since each route may want slightly different error formatting.
 */
export async function isRequestFromAdmin(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    return isAdminEmail(user?.email);
  } catch (err) {
    console.error('[requireAdmin] auth check failed:', err);
    return false; // fail closed — if we can't verify, refuse
  }
}
