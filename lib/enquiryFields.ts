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
