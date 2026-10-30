import { describe, it, expect } from 'vitest';
import { validateBillingDetails } from './billingDetails';

const ok = { client_name: 'Test Student', client_email: 'Student@Example.com', client_type: 'individual', client_address: '12 Test Street, Coimbatore', client_state: 'Tamil Nadu' };

describe('validateBillingDetails', () => {
  it('accepts an individual with no PAN or GSTIN and cleans the email', () => {
    const r = validateBillingDetails(ok);
    expect(r.ok && r.value.client_email).toBe('student@example.com');
    expect(r.ok && r.value.client_gst).toBeNull();
  });
  it('requires name, address and a valid state', () => {
    expect(validateBillingDetails({ ...ok, client_name: '' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_address: 'x' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_state: 'Atlantis' }).ok).toBe(false);
  });
  it('a company needs a name and a GSTIN or PAN', () => {
    expect(validateBillingDetails({ ...ok, client_type: 'company' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_type: 'company', client_company: 'Acme Pvt Ltd' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_type: 'company', client_company: 'Acme Pvt Ltd', client_pan: 'abcde1234f' }).ok).toBe(true);
  });
  it('rejects malformed PAN and GSTIN', () => {
    expect(validateBillingDetails({ ...ok, client_pan: 'ABC123' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_gst: '12345' }).ok).toBe(false);
  });
  it('Outside India is accepted only for USD checkouts', () => {
    expect(validateBillingDetails({ ...ok, client_state: 'Outside India' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_state: 'Outside India' }, { allowOutsideIndia: true }).ok).toBe(true);
  });
  it('ignores company text on an individual and strips line breaks', () => {
    const r = validateBillingDetails({ ...ok, client_company: 'Sneaky', client_name: 'A\r\nB' });
    expect(r.ok && r.value.client_company).toBeNull();
    expect(r.ok && r.value.client_name).toBe('A B');
  });
});
