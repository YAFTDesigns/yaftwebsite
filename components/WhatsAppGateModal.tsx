'use client';

import { useEffect, useRef, useState } from 'react';
import { storeWhatsappAccess, requestWhatsappAccess } from '@/lib/whatsappAccess';
import { track } from '@/lib/analytics';

export const OPEN_WHATSAPP_GATE_EVENT = 'yaft:open-whatsapp-gate';

export type WhatsAppGateDetail = { text: string; fallbackUrl: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WhatsAppGateModal() {
  const [open, setOpen]             = useState(false);
  const [visible, setVisible]       = useState(false);
  const [pending, setPending]       = useState<WhatsAppGateDetail | null>(null);
  const [email, setEmail]           = useState('');
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<WhatsAppGateDetail>).detail;
      setPending(detail);
      setError('');
      setEmail('');
      setSubmitting(false);
      setOpen(true);
      track('whatsapp_gate_open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
          emailRef.current?.focus();
        });
      });
    }
    window.addEventListener(OPEN_WHATSAPP_GATE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_WHATSAPP_GATE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && open) close(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setVisible(false);
    setTimeout(() => { setOpen(false); setPending(null); }, 300);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimEmail = email.trim();
    if (!EMAIL_RE.test(trimEmail)) {
      setError('Enter a valid email to continue to WhatsApp.');
      return;
    }
    setError('');
    setSubmitting(true);
    storeWhatsappAccess(trimEmail);
    track('whatsapp_click', { meta: { gated: true } });

    const text = pending?.text ?? "Hi, I'm interested in your Rhino3D and Grasshopper courses.";
    const fallbackUrl = pending?.fallbackUrl ?? `/api/wa?text=${encodeURIComponent(text)}`;
    const url = await requestWhatsappAccess(trimEmail, text, fallbackUrl);

    close();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.3s ease',
      opacity: visible ? 1 : 0,
    }}>
      <div onClick={close} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.88)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 400,
        margin: '0 16px',
        background: '#0a0a0a',
        border: '1px solid rgba(37,211,102,0.35)',
        borderTop: '2px solid #25D366',
        borderRadius: 2,
        padding: '28px 28px 24px',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'transform 0.3s ease',
      }}>
        <button onClick={close} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14,
          background: 'transparent', border: '1px solid #222',
          color: '#555', cursor: 'pointer', fontSize: 12,
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 2,
        }}>✕</button>

        <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', color: '#25D366', textTransform: 'uppercase', marginBottom: 12 }}>
          Before you chat
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
          Leave your email
        </h3>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 18 }}>
          So we know who to expect on WhatsApp. You&apos;ll be taken straight there after.
        </p>

        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 18 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 5 }}>Email</label>
              <input
                ref={emailRef}
                type="email"
                required
                placeholder="you@studio.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%', background: '#111', border: '1px solid #2a2a2a',
                  borderRadius: 2, padding: '9px 11px', color: '#aaa',
                  fontSize: 13, outline: 'none', fontFamily: 'var(--sans)',
                }}
              />
            </div>
            {error && <p style={{ fontSize: 11, color: '#C1121F', marginBottom: 12, fontFamily: 'var(--mono)' }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={close} style={{
                background: 'transparent', border: '1px solid #2a2a2a',
                color: '#555', padding: '8px 16px', fontSize: 12,
                cursor: 'pointer', borderRadius: 2,
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                background: '#25D366', border: 'none',
                color: '#0a0a0a', padding: '8px 20px', fontSize: 12,
                fontWeight: 600, cursor: 'pointer', borderRadius: 2,
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Opening...' : 'Continue to WhatsApp →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
