import { getSessionId } from '@/lib/analytics';

const STORAGE_KEY = 'yaftWhatsappAccess';

export function hasStoredWhatsappAccess(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function storeWhatsappAccess(email: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, ts: Date.now() }));
  } catch {
    // localStorage unavailable (private browsing, etc.) — gate just re-prompts next time
  }
}

export async function requestWhatsappAccess(email: string, text: string, fallbackUrl: string): Promise<string> {
  try {
    const res = await fetch('/api/whatsapp/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, text, sessionId: getSessionId() }),
    });
    if (!res.ok) return fallbackUrl;
    const data = await res.json();
    return typeof data?.url === 'string' ? data.url : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}
