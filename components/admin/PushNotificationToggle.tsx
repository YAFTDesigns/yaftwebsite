'use client';

import { useEffect, useState } from 'react';

// Standard boilerplate for the Push API -- applicationServerKey must be
// a Uint8Array, but VAPID public keys are handed out URL-safe base64.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type Status = 'checking' | 'unsupported' | 'off' | 'on' | 'denied' | 'working';

export default function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    // Always starts as 'checking' (matching server-rendered output
    // exactly, both render null) to avoid a hydration mismatch --
    // resolving synchronously-knowable states like 'unsupported' or
    // 'denied' in the lazy useState initializer would make the
    // client's first paint diverge from what the server sent down.
    // Wrapped in an async function, rather than setState as the
    // effect body's first statement, per the lint rule this file
    // previously tripped -- setState belongs after genuine async
    // work, not as a synchronous first line.
    async function detect() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? 'on' : 'off');
      } catch {
        setStatus('unsupported');
      }
    }
    detect();
  }, []);

  async function enable() {
    setStatus('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus(permission === 'denied' ? 'denied' : 'off'); return; }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) { setStatus('off'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      setStatus('on');
    } catch (err) {
      console.error('[push] enable failed:', err);
      setStatus('off');
    }
  }

  async function disable() {
    setStatus('working');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch (err) {
      console.error('[push] disable failed:', err);
      setStatus('on');
    }
  }

  if (status === 'checking') return null;
  if (status === 'unsupported') return null; // e.g. iOS Safari outside a home-screen install, or an old browser

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      <h3 style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
        New enquiry notifications
      </h3>
      {status === 'denied' ? (
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-soft)' }}>
          Notifications are blocked for this site in your browser settings. Enable them there to turn this on.
        </p>
      ) : (
        <button
          onClick={status === 'on' ? disable : enable}
          disabled={status === 'working'}
          style={{
            fontFamily: 'var(--mono)', fontSize: 13,
            color: status === 'on' ? '#4caf50' : 'var(--blueprint)',
            background: 'transparent',
            border: status === 'on' ? '1px solid #4caf50' : '1px solid var(--blueprint)',
            borderRadius: 6, padding: '8px 14px', cursor: 'pointer',
            opacity: status === 'working' ? 0.6 : 1,
          }}
        >
          {status === 'working' ? 'Working...' : status === 'on' ? '✓ Notifications on -- tap to turn off' : 'Enable notifications for new enquiries'}
        </button>
      )}
    </div>
  );
}
