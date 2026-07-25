const SESSION_KEY = 'yaftSessionId';
const SOURCE_KEY = 'yaftSessionSource';

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
  eventType: 'page_view' | 'syllabus_modal_open' | 'syllabus_unlock' | 'enquiry_submit' | 'course_gate_open' | 'course_gate_unlock',
  extra: { page?: string; courseSlug?: string; meta?: Record<string, unknown> } = {}
) {
  try {
    const source = getSessionSource();
    const payload = JSON.stringify({ sessionId: getSessionId(), eventType, ...source, ...extra });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/event', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // analytics must never break the page
  }
}
