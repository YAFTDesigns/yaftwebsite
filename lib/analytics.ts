const SESSION_KEY = 'yaftSessionId';

export function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
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
    const payload = JSON.stringify({ sessionId: getSessionId(), eventType, ...extra });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/event', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/analytics/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // analytics must never break the page
  }
}
