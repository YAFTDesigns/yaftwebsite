import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails('mailto:yaftdesigns@gmail.com', publicKey, privateKey);
  configured = true;
  return true;
}

// Sends to every stored subscription (single-admin tool, so in
// practice this is Yokes' own device(s)). A subscription that's gone
// stale -- browser data cleared, notification permission revoked --
// comes back as an error with a 404/410 status; those get pruned from
// the table so this doesn't keep retrying dead endpoints forever.
export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) {
    console.error('[webPush] VAPID keys not configured -- skipping push send');
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabaseAdmin();
  const { data: subs } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error('[webPush] send failed:', err);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds);
  }

  return { sent, failed };
}
