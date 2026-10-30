import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin';

/** Email of the logged-in admin (for audit trails), or null. Never use it to authorise: call isRequestFromAdmin() for that. */
export async function adminEmail(): Promise<string | null> {
  try {
    const { data: { user } } = await (await getSupabaseServer()).auth.getUser();
    return isAdminUser(user) ? (user!.email ?? null) : null;
  } catch { return null; }
}
