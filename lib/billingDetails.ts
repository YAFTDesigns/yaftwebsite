import { INDIAN_STATES, GSTIN_RE } from '@/lib/indianStates';
import { STRICT_EMAIL_RE } from '@/lib/enquiryFields';

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type BillingDetails = {
  client_name: string; client_email: string; client_phone: string | null; client_type: 'individual' | 'company';
  client_company: string | null; client_gst: string | null; client_pan: string | null; client_address: string; client_state: string;
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '');

/** Validates what a client types into the billing form. Pure, so it is unit-tested. Returns an error message or the clean values. */
export const OUTSIDE_INDIA = 'Outside India';

export function validateBillingDetails(input: unknown, opts: { allowOutsideIndia?: boolean } = {}): { ok: true; value: BillingDetails } | { ok: false; error: string } {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const type = b.client_type === 'company' ? 'company' : 'individual';
  const name = str(b.client_name, 100);
  const email = str(b.client_email, 200).toLowerCase();
  const phone = str(b.client_phone, 20).replace(/[^\d+ ()-]/g, '');
  const company = type === 'company' ? str(b.client_company, 120) : '';
  const gst = str(b.client_gst, 20).toUpperCase().replace(/\s/g, '');
  const pan = str(b.client_pan, 12).toUpperCase().replace(/\s/g, '');
  const address = str(b.client_address, 300);
  const state = str(b.client_state, 60);

  if (!name) return { ok: false, error: 'Enter your name as it should appear on the bill.' };
  if (!STRICT_EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email. The bill is sent here.' };
  if (type === 'company' && !company) return { ok: false, error: 'Enter the company name.' };
  if (!address || address.length < 8) return { ok: false, error: 'Enter your billing address.' };
  const stateOk = (INDIAN_STATES as readonly string[]).includes(state) || (opts.allowOutsideIndia && state === OUTSIDE_INDIA);
  if (!stateOk) return { ok: false, error: 'Choose your state (decides how GST is shown on the bill).' };
  if (gst && !GSTIN_RE.test(gst)) return { ok: false, error: 'That GSTIN does not look valid. Leave it blank if you do not have one.' };
  if (pan && !PAN_RE.test(pan)) return { ok: false, error: 'That PAN does not look valid (like ABCDE1234F). Leave it blank if you do not want it on the bill.' };
  if (type === 'company' && !gst && !pan) return { ok: false, error: 'For a company bill, enter the GSTIN or the PAN.' };
  return { ok: true, value: { client_name: name, client_email: email, client_phone: phone || null, client_type: type, client_company: company || null, client_gst: gst || null, client_pan: pan || null, client_address: address, client_state: state } };
}
