const SESSION_KEY = 'yaftSessionId';
const SOURCE_KEY = 'yaftSessionSource';
const INTERNAL_KEY = 'yaftInternalTraffic';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Which of our own event types are worth GA4 knowing about as real
// events (as opposed to just page views) -- deliberately a small,
// curated set of actual business actions, not every internal event
// type. Once these are firing, mark them as "Key events" in the GA4
// admin UI (Admin > Events) to get GA4's own conversion reporting --
// that step can't be done from code, it's a one-time toggle on
// Google's side.
const GA4_EVENT_NAMES: Partial<Record<Parameters<typeof track>[0], string>> = {
  enquiry_submit: 'generate_lead',
  course_gate_unlock: 'syllabus_unlock',
  whatsapp_click: 'whatsapp_click',
};

// Founder/team browsers can mark themselves as internal once, via
// ?internal=1 in the URL (any page). Persists in localStorage until
// cleared with ?internal=0. Internal traffic is still recorded (so
// nothing silently breaks) but tagged so reporting can exclude it.
function checkInternalFlag() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('internal')) {
      const on = params.get('internal') !== '0';
      localStorage.setItem(INTERNAL_KEY, on ? '1' : '0');
    }
  } catch {
    // ignore
  }
}

function isInternalTraffic(): boolean {
  try {
    return localStorage.getItem(INTERNAL_KEY) === '1';
  } catch {
    return false;
  }
}

type SessionSource = {
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

function captureSessionSource(): SessionSource {
  const params = new URLSearchParams(window.location.search);
  return {
    referrer: document.referrer || null,
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
  };
}

function getSessionSource(): SessionSource {
  try {
    const stored = localStorage.getItem(SOURCE_KEY);
    if (stored) return JSON.parse(stored);
    const source = captureSessionSource();
    localStorage.setItem(SOURCE_KEY, JSON.stringify(source));
    return source;
  } catch {
    return { referrer: null, utmSource: null, utmMedium: null, utmCampaign: null };
  }
}

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
      // New session -- capture first-touch source now, before any
      // internal navigation can overwrite document.referrer.
      localStorage.setItem(SOURCE_KEY, JSON.stringify(captureSessionSource()));
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

export function track(
  eventType: 'page_view' | 'syllabus_modal_open' | 'syllabus_unlock' | 'enquiry_submit' | 'course_gate_open' | 'course_gate_unlock' | 'whatsapp_click' | 'whatsapp_gate_open',
  extra: { page?: string; courseSlug?: string; meta?: Record<string, unknown> } = {}
) {
  try {
    checkInternalFlag();
    const source = getSessionSource();
    const payload = JSON.stringify({ sessionId: getSessionId(), eventType, isInternal: isInternalTraffic(), ...source, ...extra });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/event', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }

    // Mirror the events GA4 actually cares about into gtag too. Only
    // fires when GA4 has genuinely loaded (real production domain,
    // per ProductionOnlyAnalytics) and never for internal/team
    // traffic, so this can't pollute GA4's conversion numbers the
    // same way the old NODE_ENV-only gate polluted them with preview
    // deployments.
    const ga4EventName = GA4_EVENT_NAMES[eventType];
    if (ga4EventName && window.gtag && !isInternalTraffic()) {
      window.gtag('event', ga4EventName, {
        course_slug: extra.courseSlug,
        page: extra.page,
      });
    }
  } catch {
    // analytics must never break the page
  }
}
