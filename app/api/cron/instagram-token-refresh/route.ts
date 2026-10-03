import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cronAuth';
import { refreshInstagramToken } from '@/lib/instagramToken';
import { sendAdminAlert } from '@/lib/adminAlert';

export const dynamic = 'force-dynamic';

// Twice a month. Internal only: it never contacts customers. It emails the owner's
// own inbox only when a refresh fails, so an expiring token is noticed in time.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await refreshInstagramToken();
  if (!result.ok) {
    await sendAdminAlert(
      'Instagram token refresh failed',
      `<p>The Instagram reels grid on /projects will stop showing posts if this is not fixed.</p><p>${result.reason.replace(/</g, '&lt;')}</p><p>Fix: generate a new token in Meta for Developers (Instagram API setup) and replace INSTAGRAM_ACCESS_TOKEN in Vercel, then redeploy.</p>`
    );
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 502 });
  }
  return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
}
