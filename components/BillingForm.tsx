'use client';

import { INDIAN_STATES } from '@/lib/indianStates';

export type Details = { client_name: string; client_email: string; client_phone: string; client_type: 'individual' | 'company'; client_company: string; client_gst: string; client_pan: string; client_address: string; client_state: string };

const field = { width: '100%', fontFamily: 'inherit', padding: '10px 12px', fontSize: 15, background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 6 } as const;
const label = { display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.8 } as const;

/** The client's own billing details for the tax invoice. Shared by the pay link and course checkout. */
export default function BillingForm({ d, set, disabled, allowOutsideIndia }: { d: Details; set: (k: keyof Details, v: string) => void; disabled?: boolean; allowOutsideIndia?: boolean }) {
  return (
    <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 18 }} disabled={disabled}>
      <legend style={{ padding: '0 6px', fontSize: 13 }}>Billing details for your tax invoice</legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <div><label style={label} htmlFor="b-type">Billing as</label>
          <select id="b-type" style={field} value={d.client_type} onChange={(e) => set('client_type', e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select></div>
        {d.client_type === 'company' && <div><label style={label} htmlFor="b-co">Company name</label><input id="b-co" style={field} value={d.client_company} onChange={(e) => set('client_company', e.target.value)} autoComplete="organization" /></div>}
        <div><label style={label} htmlFor="b-name">{d.client_type === 'company' ? 'Contact person' : 'Name on the bill'}</label><input id="b-name" style={field} value={d.client_name} onChange={(e) => set('client_name', e.target.value)} autoComplete="name" /></div>
        <div><label style={label} htmlFor="b-email">Email (bill is sent here)</label><input id="b-email" type="email" style={field} value={d.client_email} onChange={(e) => set('client_email', e.target.value)} autoComplete="email" /></div>
        <div><label style={label} htmlFor="b-phone">Phone (optional)</label><input id="b-phone" style={field} value={d.client_phone} onChange={(e) => set('client_phone', e.target.value)} autoComplete="tel" /></div>
        <div><label style={label} htmlFor="b-gst">GSTIN {d.client_type === 'company' ? '(GSTIN or PAN needed)' : '(optional)'}</label><input id="b-gst" style={field} value={d.client_gst} onChange={(e) => set('client_gst', e.target.value.toUpperCase())} maxLength={15} /></div>
        <div><label style={label} htmlFor="b-pan">PAN {d.client_type === 'company' ? '(GSTIN or PAN needed)' : '(optional)'}</label><input id="b-pan" style={field} value={d.client_pan} onChange={(e) => set('client_pan', e.target.value.toUpperCase())} maxLength={10} /></div>
        <div><label style={label} htmlFor="b-state">State (decides CGST+SGST or IGST)</label>
          <select id="b-state" style={field} value={d.client_state} required onChange={(e) => set('client_state', e.target.value)}>
            <option value="" disabled>Select your state</option>
            {allowOutsideIndia && <option>Outside India</option>}
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select></div>
      </div>
      <div style={{ marginTop: 12 }}><label style={label} htmlFor="b-addr">Billing address</label>
        <textarea id="b-addr" style={{ ...field, minHeight: 70 }} value={d.client_address} onChange={(e) => set('client_address', e.target.value)} autoComplete="street-address" /></div>
    </fieldset>
  );
}
