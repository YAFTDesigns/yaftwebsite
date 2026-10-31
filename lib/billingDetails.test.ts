import { describe, it, expect } from 'vitest';
import { validateBillingDetails } from './billingDetails';

const ok = { client_name: 'Test Student', client_email: 'Student@Example.com', client_type: 'individual', client_phone: '+91 98765 43210', client_pan: 'ABCDE1234F', client_address: '12 Test Street, Coimbatore', client_state: 'Tamil Nadu' };
const GST = '33ABCDE1234F1Z5';

describe('validateBillingDetails', () => {
  it('a phone number is mandatory', () => {
    expect(validateBillingDetails({ ...ok, client_phone: '' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_phone: '123' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_phone: undefined }).ok).toBe(false);
  });
  it('an individual must give a valid PAN', () => {
    expect(validateBillingDetails({ ...ok, client_pan: '' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_pan: undefined }).ok).toBe(false);
  });
  it('accepts an individual with a PAN and no GSTIN, and cleans the email', () => {
    const r = validateBillingDetails(ok);
    expect(r.ok && r.value.client_email).toBe('student@example.com');
    expect(r.ok && r.value.client_gst).toBeNull();
  });
  it('requires name, address and a valid state', () => {
    expect(validateBillingDetails({ ...ok, client_name: '' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_address: 'x' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_state: 'Atlantis' }).ok).toBe(false);
  });
  it('a company needs a name and a GSTIN (a PAN alone is not enough)', () => {
    expect(validateBillingDetails({ ...ok, client_type: 'company', client_pan: '' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_type: 'company', client_company: 'Acme Pvt Ltd', client_pan: 'abcde1234f' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_type: 'company', client_gst: GST, client_pan: '' }).ok).toBe(false);
    expect(validateBillingDetails({ ...ok, client_type: 'company', client_company: 'Acme Pvt Ltd', client_gst: GST, client_pan: '' }).ok).toBe(true);
  });
  it('billing outside India needs neither PAN nor GSTIN', () => {
    expect(validateBillingDetails({ ...ok, client_pan: '', client_state: 'Outside India' }, { allowOutsideIndia: true }).ok).toBe(true);
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
