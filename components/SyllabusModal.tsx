'use client';

import { useEffect, useRef, useState } from 'react';
import { OPEN_SYLLABUS_EVENT, type SyllabusOpenDetail } from './SyllabusButton';
import { storeCreds, requestSyllabusAccess } from '@/lib/syllabusAccess';
import { track } from '@/lib/analytics';

export default function SyllabusModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<SyllabusOpenDetail | null>(null);
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<SyllabusOpenDetail>).detail;
      setPending(detail);
      setError('');
      setSubmitting(false);
      setOpen(true);
      track('syllabus_modal_open', { courseSlug: detail.slug });
      requestAnimationFrame(() => emailRef.current?.focus());
    }
    window.addEventListener(OPEN_SYLLABUS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SYLLABUS_EVENT, onOpen);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    setPending(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedLinkedin = linkedin.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    const linkedinOk = /linkedin\.com\//i.test(trimmedLinkedin);

    if (!emailOk && !linkedinOk) {
      setError('Please enter at least your email or LinkedIn profile URL.');
      return;
    }
    setError('');
    setSubmitting(true);

    const fallbackUrl = pending?.pdf ?? '';
    const slug = pending?.slug ?? '';
    // Open synchronously within the click/submit's user-activation window, then
    // redirect once the API responds, awaiting first risks popup blockers.
    const tab = window.open('', '_blank');

    const url = await requestSyllabusAccess(slug, { email: trimmedEmail, linkedin: trimmedLinkedin }, fallbackUrl);
    storeCreds(trimmedEmail, trimmedLinkedin);
    track('syllabus_unlock', { courseSlug: slug });

    setSubmitting(false);
    close();
    if (tab) tab.location.href = url;
    else window.open(url, '_blank');
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`}>
      <div className="modal-backdrop" onClick={close} />
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={close}>✕</button>
        <div className="eyebrow">UNLOCK SYLLABUS</div>
        <h3>Get the full course syllabus</h3>
        <span className="modal-course">{pending?.course ?? ''}</span>
        <p className="modal-lede">Leave your email or LinkedIn, just one is enough, and the PDF opens straight away.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              ref={emailRef}
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>LinkedIn profile</label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
          </div>
          {error && <p className="modal-error show">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Opening…' : 'View syllabus PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
