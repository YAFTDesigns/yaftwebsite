import { getSupabaseAdmin } from '@/lib/supabase/admin';

/** Portal audit trail. Never pass tokens, passwords or payment data in `detail`. Failure to log never breaks the request. */
export async function audit(e: { actor_type: 'student' | 'admin' | 'system' | 'anonymous'; actor_ref?: string | null; action: string; subject?: string | null; detail?: Record<string, unknown> }): Promise<void> {
  try {
    await getSupabaseAdmin().from('portal_audit_events').insert({ actor_type: e.actor_type, actor_ref: e.actor_ref ?? null, action: e.action, subject: e.subject ?? null, detail: e.detail ?? {} });
  } catch (err) {
    console.error('[portal-audit] failed:', err);
  }
}
