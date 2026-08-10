/**
 * Single source of truth for invoice tax/total calculation.
 *
 * Before this existed, this logic was implemented independently in
 * three places (the create-invoice form, the edit-invoice panel, the
 * server-side update_details handler, and the PDF generator -- four,
 * really) and had already drifted: the PDF generator was missing the
 * international-client exemption, meaning a Singapore/Australia/UAE/
 * Oman invoice could show a different tax amount on the PDF sent to
 * the client than what was actually stored and charged. Every caller
 * should import computeInvoiceTotals from here instead of recomputing
 * it locally -- that's the actual fix, not just the tests.
 *
 * Tax rule (India GST, intra-state vs inter-state vs export/intl):
 *  - Client state is Tamil Nadu (YAFT's home state)  -> CGST 9% + SGST 9%
 *  - Client is in an international/export bucket     -> no GST
 *  - Anything else (other Indian states)              -> IGST 18%
 *
 * This module must stay dependency-free (no Supabase, no Next.js
 * server APIs) so it can be safely imported from both client
 * components and server route handlers.
 */

export type InvoiceLineItem = {
  desc?: string;
  hrs?: number;
  qty: number;
  rate: number;
};

export type InvoiceTaxMode = 'intra' | 'intl' | 'interstate';

export type InvoiceTotals = {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  taxMode: InvoiceTaxMode;
};

const INTL_STATES = ['australia', 'singapore', 'uae', 'oman', 'international'];

export function getTaxMode(clientState: string): InvoiceTaxMode {
  const state = (clientState || '').toLowerCase();
  if (state.includes('tamil')) return 'intra';
  if (INTL_STATES.includes(state)) return 'intl';
  return 'interstate';
}

export function computeInvoiceTotals(items: InvoiceLineItem[], clientState: string): InvoiceTotals {
  const subtotal = (items ?? []).reduce((sum, item) => sum + (Number(item.rate) || 0) * (Number(item.qty) || 0), 0);
  const taxMode = getTaxMode(clientState);
  return computeTaxFromMode(subtotal, taxMode);
}

// Same tax rule, keyed directly off an already-known tax mode rather than
// derived from a client state string. Used by jobs, which store gst_type
// directly per job instead of looking it up from a client's address.
export function computeTaxFromMode(subtotal: number, taxMode: InvoiceTaxMode): InvoiceTotals {
  const cgst = taxMode === 'intra' ? subtotal * 0.09 : 0;
  const sgst = taxMode === 'intra' ? subtotal * 0.09 : 0;
  const igst = taxMode === 'interstate' ? subtotal * 0.18 : 0;

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    total: subtotal + cgst + sgst + igst,
    taxMode,
  };
}
