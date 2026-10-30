import { getSupabaseServer } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

/** Email of the logged-in admin (for audit trails), or null. Never use it to authorise: call isRequestFromAdmin() for that. */
export async function adminEmail(): Promise<string | null> {
  try {
    const { data: { user } } = await (await getSupabaseServer()).auth.getUser();
    return user?.email && isAdminEmail(user.email) ? user.email : null;
  } catch { return null; }
}
