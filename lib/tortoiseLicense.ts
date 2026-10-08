import { randomBytes } from 'node:crypto';

// no 0/O/1/I so keys are easy to read out over the phone
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newLicenseKey(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `TORT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function normalizeKey(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
