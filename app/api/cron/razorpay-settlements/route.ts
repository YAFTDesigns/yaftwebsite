import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cronAuth';
import { getCronControl, DISABLED_RESPONSE } from '@/lib/cronControls';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import { syncSettlements } from '@/lib/razorpaySettlements';
import { sendAdminAlert } from '@/lib/adminAlert';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Records which payments Razorpay has paid out to the bank (read-only on Razorpay, sends no customer email).
// Cron calls it daily with the cron secret; a logged-in admin can also open it by hand with ?days=30 to back-fill.
export async function GET(request: Request) {
  const cron = isAuthorizedCron(request);
  if (!cron && !(await isRequestFromAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (cron && !(await getCronControl(getSupabaseAdmin(), 'razorpay-settlements')).enabled) return NextResponse.json(DISABLED_RESPONSE);
  const asked = Number(new URL(request.url).searchParams.get('days'));
  const days = Number.isFinite(asked) && asked >= 1 ? Math.min(Math.floor(asked), 60) : 10;
  try {
    return NextResponse.json(await syncSettlements(days));
  } catch (err) {
    console.error('[razorpay-settlements] failed:', err);
    const msg = err instanceof Error ? err.message : String(err);
    await sendAdminAlert('Razorpay settlement sync failed', `<p>${msg.replace(/[<>&]/g, '')}</p>`).catch(() => {});
    return NextResponse.json({ error: 'sync failed' }, { status: 500 });
  }
}
