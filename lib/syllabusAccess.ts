const STORAGE_KEY = 'yaftSyllabusAccess';

export type SyllabusCreds = { email: string; linkedin: string };

export function getStoredCreds(): SyllabusCreds | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.email === 'string' && typeof parsed?.linkedin === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function storeCreds(email: string, linkedin: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, linkedin, ts: Date.now() }));
  } catch {
    // localStorage unavailable (private browsing, etc.) — gate just re-prompts next time
  }
}

export async function requestSyllabusAccess(
  slug: string,
  creds: SyllabusCreds,
  fallbackUrl: string
): Promise<string> {
  try {
    const res = await fetch('/api/syllabus/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, linkedin: creds.linkedin, slug }),
    });
    if (!res.ok) return fallbackUrl;
    const data = await res.json();
    return typeof data?.url === 'string' ? data.url : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}
