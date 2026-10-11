'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import AnalyticsTracker from './AnalyticsTracker';

const GA_MEASUREMENT_ID = 'G-XDVDJC7X24';

// Pages whose URL carries a private share token or admin/auth state must never
// reach any analytics provider.
const PRIVATE_PATH = /^\/(client-jobs|team-jobs|admin|auth)(\/|$)/;

// Google Tag Manager flagged "additional domains detected" -- the old
// gate was process.env.NODE_ENV === 'production' only, which is true
// for every Vercel deployment including every preview URL, not just
// the real site. That meant every preview alias
// (yaftwebsite-xyz-yaft-designs.vercel.app, one per deploy this
// session included) fired the real GA4 tag AND this site's own
// internal analytics_events tracking, mixing preview/test traffic
// into real visitor data.
//
// Checked in the browser via window.location.hostname rather than
// the server-side request host: reading the request host in the
// RootLayout Server Component (via next/headers) works, but headers()
// is a dynamic API that forces the entire app out of static
// generation -- pages like /courses, /insights, /privacy that were
// previously prerendered as static HTML all became server-rendered
// on every request. Gating client-side here keeps every page exactly
// as static or dynamic as it already was; this component is the only
// thing that becomes client-rendered, and it renders nothing visible
// either way.
export default function ProductionOnlyAnalytics() {
  const pathname = usePathname();
  const [isRealDomain, setIsRealDomain] = useState(false);
  const [consent, setConsent] = useState<'granted' | 'denied' | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes React state with window.location (an external system) on mount, not a cascading-render bug
    setIsRealDomain(window.location.hostname.includes('yaftdesigns.com'));
    try {
      const v = window.localStorage.getItem('yaft-consent');
      if (v === 'granted' || v === 'denied') setConsent(v);
    } catch {}
  }, []);

  function choose(v: 'granted' | 'denied') {
    try { window.localStorage.setItem('yaft-consent', v); } catch {}
    setConsent(v);
  }

  if (process.env.NODE_ENV !== 'production' || !isRealDomain) return null;
  if (PRIVATE_PATH.test(pathname ?? '')) return null;

  return (
    <>
      {consent === null && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          style={{
            position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 9999,
            maxWidth: 560, margin: '0 auto', background: '#111', color: '#ddd',
            border: '1px solid #2a2a2a', borderRadius: 4, padding: '14px 16px',
            fontSize: 13, lineHeight: 1.5, boxShadow: '0 8px 30px rgba(0,0,0,.5)',
          }}
        >
          <p style={{ margin: '0 0 12px' }}>
            We use Google Analytics cookies to understand how the site is used. Say no and we only count anonymous visits.{' '}
            <a href="/cookies" style={{ color: 'inherit', textDecoration: 'underline' }}>Cookies</a>
            {' · '}
            <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy</a>
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => choose('denied')} style={{ background: 'transparent', border: '1px solid #444', color: '#ddd', padding: '7px 16px', fontSize: 12, cursor: 'pointer', borderRadius: 2 }}>Decline</button>
            <button type="button" onClick={() => choose('granted')} style={{ background: '#E63946', border: 'none', color: '#fff', padding: '7px 18px', fontSize: 12, cursor: 'pointer', borderRadius: 2 }}>Accept</button>
          </div>
        </div>
      )}
      {consent === 'granted' && (
        <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
      <AnalyticsTracker />
        </>
      )}
      <Analytics
        beforeSend={(event) => {
          try {
            return PRIVATE_PATH.test(new URL(event.url).pathname) ? null : event;
          } catch {
            return null;
          }
        }}
      />
    </>
  );
}
