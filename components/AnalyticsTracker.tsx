'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (/^\/(client-jobs|team-jobs|admin|auth)(\/|$)/.test(pathname ?? '')) return;
    track('page_view', { page: pathname });
  }, [pathname]);

  return null;
}
