'use client';

import { INDIAN_STATES } from '@/lib/indianStates';

export type Details = { client_name: string; client_email: string; client_phone: string; client_type: 'individual' | 'company'; client_company: string; client_gst: string; client_pan: string; client_address: string; client_state: string };

const field = { width: '100%', height: 46, boxSizing: 'border-box', fontFamily: 'inherit', padding: '0 12px', fontSize: 15, background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 6 } as const;
const label = { display: 'block', fontSize: 13, fontFamily: 'inherit', letterSpacing: 0, textTransform: 'none', marginBottom: 6, opacity: 0.9 } as const;
const hint = { fontSize: 12, opacity: 0.6, marginTop: 4 } as const;
const group = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blueprint)', margin: '22px 0 12px', paddingBottom: 8, borderBottom: '1px solid var(--line)' } as const;
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 } as const;

/** The client's own billing details for the tax invoice. Shared by the pay link and course checkout. */
export default function BillingForm({ d, set, disabled, allowOutsideIndia }: { d: Details; set: (k: keyof Details, v: string) => void; disabled?: boolean; allowOutsideIndia?: boolean }) {
  const abroad = d.client_state === 'Outside India';
  const company = d.client_type === 'company';
  return (
    <fieldset style={{ border: '1px solid var(--line)', borderRadius: 0, padding: '8px 24px 24px', marginBottom: 18, minInlineSize: 0 }} disabled={disabled}>
      <legend style={{ padding: '0 8px', fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blueprint)' }}>Billing details for your tax invoice</legend>

      <div style={{ ...group, marginTop: 14 }}>1. Who is paying</div>
      <div style={grid}>
        <div><label style={label} htmlFor="b-type">Billing as</label>
          <select id="b-type" style={field} value={d.client_type} onChange={(e) => set('client_type', e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select></div>
        {company && <div><label style={label} htmlFor="b-co">Company name *</label><input id="b-co" required style={field} value={d.client_company} onChange={(e) => set('client_company', e.target.value)} autoComplete="organization" /></div>}
        <div><label style={label} htmlFor="b-name">{company ? 'Contact person' : 'Name on the bill'}</label><input id="b-name" style={field} value={d.client_name} onChange={(e) => set('client_name', e.target.value)} autoComplete="name" /></div>
        <div><label style={label} htmlFor="b-email">Email</label><input id="b-email" type="email" style={field} value={d.client_email} onChange={(e) => set('client_email', e.target.value)} autoComplete="email" /><div style={hint}>Your bill is sent here</div></div>
        <div><label style={label} htmlFor="b-phone">Phone <span style={{ opacity: 0.6 }}>(optional)</span></label><input id="b-phone" style={field} value={d.client_phone} onChange={(e) => set('client_phone', e.target.value)} autoComplete="tel" /></div>
      </div>

      <div style={group}>2. Tax details</div>
      <div style={grid}>
        <div><label style={label} htmlFor="b-pan">PAN {company || abroad ? <span style={{ opacity: 0.6 }}>(optional)</span> : '*'}</label><input id="b-pan" required={!company && !abroad} style={field} value={d.client_pan} onChange={(e) => set('client_pan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" /><div style={hint}>{company ? 'Optional for companies' : 'Required for individuals'}</div></div>
        <div><label style={label} htmlFor="b-gst">GSTIN {company && !abroad ? '*' : <span style={{ opacity: 0.6 }}>(optional)</span>}</label><input id="b-gst" required={company && !abroad} style={field} value={d.client_gst} onChange={(e) => set('client_gst', e.target.value.toUpperCase())} maxLength={15} placeholder="15 characters" /><div style={hint}>{company ? 'Required for companies' : 'Only if you want it on the bill'}</div></div>
      </div>

      <div style={group}>3. Billing address</div>
      <div style={grid}>
        <div><label style={label} htmlFor="b-state">State</label>
          <select id="b-state" style={field} value={d.client_state} required onChange={(e) => set('client_state', e.target.value)}>
            <option value="" disabled>Select your state</option>
            {allowOutsideIndia && <option>Outside India</option>}
            {INDIAN_STATES.map((st) => <option key={st}>{st}</option>)}
          </select><div style={hint}>Decides CGST + SGST or IGST</div></div>
      </div>
      <div style={{ marginTop: 16 }}><label style={label} htmlFor="b-addr">Address</label>
        <textarea id="b-addr" style={{ ...field, height: 'auto', padding: 12, minHeight: 84 }} value={d.client_address} onChange={(e) => set('client_address', e.target.value)} autoComplete="street-address" /></div>
    </fieldset>
  );
}
