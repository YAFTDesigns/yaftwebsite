import { createHash, randomBytes } from 'node:crypto';

// Guest-enrolment claim tokens. The raw token only ever travels in the email to the billing address;
// the database keeps a SHA-256 hash, so a database leak cannot be replayed. 256-bit random: not guessable.
export const CLAIM_TTL_HOURS = 72;
export const MAX_FAILED_ATTEMPTS = 5;

export const newClaimToken = (): string => randomBytes(32).toString('base64url');
export const hashClaimToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const hashEmail = (email: string): string => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
export const isWellFormedToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);

export type ClaimRow = { expires_at: string; used_at: string | null; failed_attempts: number };
export type ClaimVerdict = 'ok' | 'expired' | 'used' | 'locked';

/** Single-use, expiring, brute-force limited. Callers show the same generic message for every non-ok verdict. */
export function claimVerdict(row: ClaimRow, now: Date = new Date()): ClaimVerdict {
  if (row.used_at) return 'used';
  if (row.failed_attempts >= MAX_FAILED_ATTEMPTS) return 'locked';
  if (new Date(row.expires_at).getTime() <= now.getTime()) return 'expired';
  return 'ok';
}

export const claimExpiry = (now: Date = new Date()): Date => new Date(now.getTime() + CLAIM_TTL_HOURS * 3600_000);
