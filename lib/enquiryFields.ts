// Optional enquiry fields added for marketing measurement. Both are
// optional: a missing or blank value is fine, an invalid one is rejected.

export const SEGMENTS = ['individual', 'college', 'corporate'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  individual: 'Individual learner',
  college: 'College or university',
  corporate: 'Company or firm',
};

export function normalizeSegment(v: unknown): { ok: true; value: Segment | null } | { ok: false } {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  if (typeof v === 'string' && (SEGMENTS as readonly string[]).includes(v)) return { ok: true, value: v as Segment };
  return { ok: false };
}

// Accepts +91 98765 43210, (0422) 123-4567, 9876543210. 7 to 15 digits.
export function normalizePhone(v: unknown): { ok: true; value: string | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== 'string') return { ok: false };
  const t = v.trim();
  if (t === '') return { ok: true, value: null };
  if (t.length > 30 || !/^\+?[\d\s\-().]+$/.test(t)) return { ok: false };
  const digits = t.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return { ok: false };
  return { ok: true, value: t.replace(/\s+/g, ' ') };
}

// ── Audience / funnel capture ────────────────────────────────────────
// audience = who is writing; funnel = which website path they came through.
// segment (above) stays as the coarse 3-way grouping and is derived from audience.

export const AUDIENCES = ['student', 'professional', 'college', 'company'] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABELS: Record<Audience, string> = {
  student: 'Student',
  professional: 'Working professional',
  college: 'College or university',
  company: 'Company or firm',
};

export const FUNNELS = ['individual', 'college', 'corporate', 'consulting'] as const;
export type Funnel = (typeof FUNNELS)[number];
export const FUNNEL_LABELS: Record<Funnel, string> = {
  individual: 'Individual',
  college: 'College',
  corporate: 'Corporate',
  consulting: 'Consulting',
};

export function audienceToSegment(a: Audience): Segment {
  return a === 'college' ? 'college' : a === 'company' ? 'corporate' : 'individual';
}

export function defaultFunnel(a: Audience): Funnel {
  return a === 'college' ? 'college' : a === 'company' ? 'corporate' : 'individual';
}

function normalizeEnum<T extends string>(v: unknown, allowed: readonly T[]): { ok: true; value: T | null } | { ok: false } {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return { ok: true, value: v as T };
  return { ok: false };
}
export const normalizeAudience = (v: unknown) => normalizeEnum(v, AUDIENCES);
export const normalizeFunnel = (v: unknown) => normalizeEnum(v, FUNNELS);

// Free text capped to a column limit; non-strings and blanks become null.
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  return t ? t.slice(0, max) : null;
}

// Extra answers on institutional enquiries. Only these keys are ever stored.
export const DETAIL_KEYS = ['role', 'participants', 'duration', 'dates', 'city'] as const;
export type EnquiryDetails = Partial<Record<(typeof DETAIL_KEYS)[number], string>>;

export function cleanDetails(v: unknown): EnquiryDetails | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: EnquiryDetails = {};
  for (const k of DETAIL_KEYS) {
    const t = cleanText((v as Record<string, unknown>)[k], 120);
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}
