'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeCreds, getStoredCreds } from '@/lib/syllabusAccess';
import { track } from '@/lib/analytics';

export const OPEN_COURSE_GATE_EVENT = 'yaft:open-course-gate';

export type CourseGateDetail = { href: string; course: string; slug: string };

export default function CourseGateModal() {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [visible, setVisible]     = useState(false);
  const [pending, setPending]     = useState<CourseGateDetail | null>(null);
  const [email, setEmail]         = useState('');
  const [linkedin, setLinkedin]   = useState('');
  const [error, setError]         = useState('');
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
    setTimeout(() => { setOpen(false); setPending(null); }, 350);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimEmail    = email.trim();
    const trimLinkedin = linkedin.trim();
    const emailOk    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail);
    const linkedinOk = /linkedin\.com\//i.test(trimLinkedin);

    if (!emailOk && !linkedinOk) {
      setError('Please enter at least your email or LinkedIn profile URL.');
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
      transition: 'opacity 0.35s ease',
      opacity: visible ? 1 : 0,
    }}>
      {/* Blur backdrop */}
      <div
        onClick={close}
        style={{
          position: 'absolute', inset: 0,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          background: 'rgba(6,6,6,0.55)',
        }}
      />

      {/* Liquid glass box */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 460,
        margin: '0 16px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        backdropFilter: 'blur(32px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
        padding: '36px 32px 32px',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%', width: 32, height: 32,
            color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--blueprint)', marginBottom: 10, textTransform: 'uppercase' }}>
          UNLOCK COURSE
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>
          View the full course and syllabus
        </h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          {pending?.course ?? ''}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 24 }}>
          Leave your email or LinkedIn, just one is enough, and you will be taken straight to the course page.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6, fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>EMAIL</label>
            <input
              ref={emailRef}
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: 'var(--sans)',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6, fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>LINKEDIN PROFILE</label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: 'var(--sans)',
              }}
            />
          </div>
          {error && <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 14 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={close} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, padding: '10px 20px', color: 'rgba(255,255,255,0.5)',
              fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{
              background: 'var(--blueprint)', border: 'none',
              borderRadius: 8, padding: '10px 24px', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Opening…' : 'View course →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
