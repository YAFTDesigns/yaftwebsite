import { describe, it, expect } from 'vitest';
import { newClaimToken, hashClaimToken, claimVerdict, isWellFormedToken, claimExpiry, MAX_FAILED_ATTEMPTS } from './claimToken';
import { cleanText, cleanName, safeHttpsLink, safeFileName, csvCell, sniffPrivateFile } from './safe';
import { buildEnrolmentCard, type PlanRow } from './enrolmentView';
import { certificateEligibility } from './certificateEligibility';

describe('claim tokens', () => {
  it('are random, well formed, and only their hash is comparable', () => {
    const a = newClaimToken(), b = newClaimToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(hashClaimToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClaimToken(a)).not.toBe(a);
    expect(isWellFormedToken('short')).toBe(false);
    expect(isWellFormedToken(undefined)).toBe(false);
  });
  const now = new Date('2026-11-01T00:00:00Z');
  const base = { expires_at: '2026-11-02T00:00:00Z', used_at: null, failed_attempts: 0 };
  it('is single use, expiring and brute-force limited', () => {
    expect(claimVerdict(base, now)).toBe('ok');
    expect(claimVerdict({ ...base, used_at: '2026-11-01T00:00:00Z' }, now)).toBe('used');
    expect(claimVerdict({ ...base, expires_at: '2026-10-31T00:00:00Z' }, now)).toBe('expired');
    expect(claimVerdict({ ...base, failed_attempts: MAX_FAILED_ATTEMPTS }, now)).toBe('locked');
  });
  it('expires 72 hours out', () => { expect(claimExpiry(now).getTime() - now.getTime()).toBe(72 * 3600_000); });
});

describe('input hygiene', () => {
  it('removes control and bidi characters', () => { expect(cleanText('a\u0000b‮c  d', 50)).toBe('abc d'); });
  it('keeps real names, drops markup', () => {
    const out = cleanName('Anjali <script>alert(1)</script> Rao');
    expect(out).not.toMatch(/[<>\/]/);
    expect(out.startsWith('Anjali')).toBe(true);
    expect(cleanName('José Ñúñez')).toBe('José Ñúñez');
  });
  it('accepts only public https links', () => {
    expect(safeHttpsLink('https://www.behance.net/x')).toBe('https://www.behance.net/x');
    for (const bad of ['http://a.com', 'javascript:alert(1)', 'data:text/html,hi', 'https://user:pw@a.com', 'https://localhost/x', 'https://127.0.0.1/', 'https://[::1]/', 'https://intranet/x', 'ftp://a.com']) expect(safeHttpsLink(bad), bad).toBeNull();
  });
  it('makes file names path-safe', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('my plan (final).PDF')).toBe('my_plan_final_.PDF');
    expect(safeFileName('')).toBe('file');
  });
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('plain')).toBe('plain');
  });
  it('checks real file content, not the name', () => {
    expect(sniffPrivateFile(new TextEncoder().encode('%PDF-1.7 ...'))?.ext).toBe('pdf');
    expect(sniffPrivateFile(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0]))?.ext).toBe('zip');
    expect(sniffPrivateFile(new TextEncoder().encode('<html><script>x</script></html>'))).toBeNull();
    expect(sniffPrivateFile(new TextEncoder().encode('<svg onload=alert(1)></svg>'))).toBeNull();
  });
});

const plan = (over: Partial<PlanRow> = {}): PlanRow => ({ id: 'p1', status: 'active', description: 'Grasshopper', structure: 'instalments', base_total: 30000, advance_base: 15000, course_slugs: ['grasshopper-architecture'], currency: 'INR', is_test: false, ...over });

describe('enrolment card (reuses the existing schedule, no new maths)', () => {
  it('unpaid: advance is next', () => {
    const c = buildEnrolmentCard(plan(), []);
    expect(c).toMatchObject({ payStatus: 'unpaid', nextAction: 'pay_advance', paidInr: 0, totalInr: 35400, balanceInr: 35400 });
  });
  it('advance paid: balance unlocks automatically', () => {
    const c = buildEnrolmentCard(plan(), ['advance']);
    expect(c).toMatchObject({ payStatus: 'advance_paid', nextAction: 'pay_balance', paidInr: 17700, balanceInr: 17700 });
  });
  it('both paid: settled, no action', () => {
    expect(buildEnrolmentCard(plan(), ['advance', 'balance'])).toMatchObject({ payStatus: 'paid_in_full', nextAction: null, balanceInr: 0 });
  });
  it('paid in full at once: settled', () => {
    expect(buildEnrolmentCard(plan(), ['full'])).toMatchObject({ payStatus: 'paid_in_full', nextAction: null, paidInr: 35400 });
  });
  it('full-payment plan', () => {
    expect(buildEnrolmentCard(plan({ structure: 'full', advance_base: null }), [])).toMatchObject({ nextAction: 'pay_full' });
  });
  it('cancelled plan offers no payment', () => {
    expect(buildEnrolmentCard(plan({ status: 'cancelled' }), [])).toMatchObject({ payStatus: 'cancelled', nextAction: null });
  });
  it('flags combo plans instead of inventing a per-course split', () => {
    expect(buildEnrolmentCard(plan({ course_slugs: ['rhino-architecture', 'grasshopper-architecture'] }), ['advance']).allocationAmbiguous).toBe(true);
  });
});

describe('certificate eligibility', () => {
  const ok = { projectState: 'approved' as const, payStatus: 'paid_in_full' as const, requiresFullPayment: true, hasLiveCertificate: false };
  it('eligible when the project is approved and fully paid', () => { expect(certificateEligibility(ok).eligible).toBe(true); });
  it('project approval is always required', () => { expect(certificateEligibility({ ...ok, projectState: 'submitted' })).toEqual({ eligible: false, missing: ['Project approval'] }); });
  it('full payment only when the course rule says so', () => {
    expect(certificateEligibility({ ...ok, payStatus: 'advance_paid' }).missing).toEqual(['Full payment']);
    expect(certificateEligibility({ ...ok, payStatus: 'advance_paid', requiresFullPayment: false }).eligible).toBe(true);
  });
  it('never twice, never when cancelled', () => {
    expect(certificateEligibility({ ...ok, hasLiveCertificate: true }).eligible).toBe(false);
    expect(certificateEligibility({ ...ok, payStatus: 'cancelled' }).eligible).toBe(false);
  });
});
