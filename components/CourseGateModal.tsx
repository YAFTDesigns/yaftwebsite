'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeCreds, getStoredCreds } from '@/lib/syllabusAccess';
import { track } from '@/lib/analytics';

export const OPEN_COURSE_GATE_EVENT = 'yaft:open-course-gate';

export type CourseGateDetail = { href: string; course: string; slug: string };

export default function CourseGateModal() {
  const router = useRouter();
  const [open, setOpen]             = useState(false);
  const [visible, setVisible]       = useState(false);
  const [pending, setPending]       = useState<CourseGateDetail | null>(null);
  const [email, setEmail]           = useState('');
  const [linkedin, setLinkedin]     = useState('');
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<CourseGateDetail>).detail;
      setPending(detail);
      setError('');
      setSubmitting(false);
      setOpen(true);
      track('course_gate_open', { courseSlug: detail.slug });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
          emailRef.current?.focus();
        });
      });
    }
    window.addEventListener(OPEN_COURSE_GATE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COURSE_GATE_EVENT, onOpen);
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
    const trimEmail    = email.trim();
    const trimLinkedin = linkedin.trim();
    const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail);
    const linkedinOk = /linkedin\.com\//i.test(trimLinkedin);
    if (!emailOk && !linkedinOk) {
      setError('Enter at least your email or LinkedIn profile URL.');
      return;
    }
    setError('');
    setSubmitting(true);
    storeCreds(trimEmail, trimLinkedin);
    track('course_gate_unlock', { courseSlug: pending?.slug ?? '' });
    close();
    if (pending?.href) router.push(pending.href);
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.3s ease',
      opacity: visible ? 1 : 0,
    }}>
      {/* Dark backdrop */}
      <div onClick={close} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.88)',
      }} />

      {/* Dark panel with crimson top border */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440,
        margin: '0 16px',
        background: '#0a0a0a',
        border: '1px solid rgba(193,18,31,0.45)',
        borderTop: '2px solid #C1121F',
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

        <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', color: '#C1121F', textTransform: 'uppercase', marginBottom: 12 }}>
          Unlock course
        </p>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
          {pending?.course ?? ''}
        </h3>
        <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 18 }}>
          Leave your email or LinkedIn, just one is enough, and you will be taken straight to the course page.
        </p>

        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 18 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 5 }}>Email</label>
              <input
                ref={emailRef}
                type="email"
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
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase', marginBottom: 5 }}>LinkedIn profile</label>
              <input
                type="url"
                placeholder="linkedin.com/in/yourname"
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
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
                background: '#C1121F', border: 'none',
                color: '#fff', padding: '8px 20px', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', borderRadius: 2,
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Opening...' : 'View course →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
