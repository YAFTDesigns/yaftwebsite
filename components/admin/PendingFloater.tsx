'use client';

import { useState } from 'react';

type PendingProps = {
  pendingTestimonials: number;
  pendingStudentWork: number;
  pendingPublications: number;
  failedEmails: number;
  outstandingInvoices: { invoice_no: string; client_name: string; balance: number }[];
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Fixed to the bottom of the viewport (not just further down the page)
// so it stays visible regardless of scroll position -- built specifically
// because the existing top-of-page "Needs attention" banner doesn't cover
// outstanding invoices at all, and its own "This month" stat only counts
// invoices created this month, meaning a real unpaid balance from a
// prior month (Saravana Kumar's, in Yokes' actual case) can be entirely
// invisible from a check made in a later month. This widget always
// pulls the true all-time outstanding list, by name, regardless of when
// the invoice was created.
export default function PendingFloater({
  pendingTestimonials, pendingStudentWork, pendingPublications, failedEmails, outstandingInvoices,
}: PendingProps) {
  const [collapsed, setCollapsed] = useState(false);

  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + Number(i.balance), 0);
  const totalPendingItems = pendingTestimonials + pendingStudentWork + pendingPublications + failedEmails + outstandingInvoices.length;

  if (totalPendingItems === 0) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 40,
          background: 'var(--brass)', color: '#fff', border: 'none', borderRadius: 999,
          padding: '10px 18px', fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {totalPendingItems} pending ↑
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 40, width: 320, maxWidth: 'calc(100vw - 40px)',
      background: '#161616', border: '1px solid var(--brass)', borderRadius: 8,
      boxShadow: '0 8px 28px rgba(0,0,0,0.5)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderBottom: '1px solid #2a2a2a', background: '#1a0808',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--brass)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Pending ({totalPendingItems})
        </span>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Minimize"
          style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
        {outstandingInvoices.length > 0 && (
          <div>
            <a href="/admin/invoices/report" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--brass)', textDecoration: 'none' }}>
              ₹{fmt(outstandingTotal)} outstanding, {outstandingInvoices.length} invoice{outstandingInvoices.length > 1 ? 's' : ''} →
            </a>
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {outstandingInvoices.map((inv) => (
                <div key={inv.invoice_no} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, color: '#999' }}>
                  <span>{inv.client_name}</span>
                  <span>₹{fmt(Number(inv.balance))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {pendingTestimonials > 0 && (
          <a href="/admin/testimonials" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', textDecoration: 'none' }}>
            {pendingTestimonials} testimonial{pendingTestimonials > 1 ? 's' : ''} →
          </a>
        )}
        {pendingStudentWork > 0 && (
          <a href="/admin/community" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', textDecoration: 'none' }}>
            {pendingStudentWork} student submission{pendingStudentWork > 1 ? 's' : ''} →
          </a>
        )}
        {pendingPublications > 0 && (
          <a href="/admin/community" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#fff', textDecoration: 'none' }}>
            {pendingPublications} publication{pendingPublications > 1 ? 's' : ''} →
          </a>
        )}
        {failedEmails > 0 && (
          <a href="/admin/emails" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#e55', textDecoration: 'none' }}>
            {failedEmails} failed email{failedEmails > 1 ? 's' : ''} →
          </a>
        )}
      </div>
    </div>
  );
}
