'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import AnalyticsTracker from './AnalyticsTracker';

const GA_MEASUREMENT_ID = 'G-XDVDJC7X24';

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
  const [isRealDomain, setIsRealDomain] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizes React state with window.location (an external system) on mount, not a cascading-render bug
    setIsRealDomain(window.location.hostname.includes('yaftdesigns.com'));
  }, []);

  if (process.env.NODE_ENV !== 'production' || !isRealDomain) return null;

  return (
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
      <Analytics />
    </>
  );
}
