'use client';

import { useState } from 'react';
import { track, getSessionId } from '@/lib/analytics';
import { SEGMENTS, SEGMENT_LABELS } from '@/lib/enquiryFields';

type ContactFormProps = {
  options: string[];
};

export default function ContactForm({ options }: ContactFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const interest = data.get('interest');
    const segment = data.get('segment');
    const phone = String(data.get('phone') ?? '').trim();

    setStatus('submitting');
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          interest,
          segment,
          phone: phone || undefined,
          message: data.get('message'),
          sessionId: getSessionId(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErrorMsg(res.status === 400 && j?.error ? String(j.error) : '');
        throw new Error('request failed');
      }
      setErrorMsg('');
      track('enquiry_submit', { meta: { interest, segment } });
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return <p className="modal-status show">Thanks, your enquiry has been sent. We&apos;ll be in touch shortly.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="contactName">Name</label>
        <input type="text" name="name" id="contactName" placeholder="Your name" required />
      </div>

      <div className="field">
        <label htmlFor="contactEmail">Email</label>
        <input type="email" name="email" id="contactEmail" placeholder="you@studio.com" required />
      </div>

      <div className="field">
        <label htmlFor="contactSegment">I am enquiring as</label>
        <select name="segment" id="contactSegment" defaultValue="individual">
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>{SEGMENT_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="contactPhone">Phone (optional)</label>
        <input type="tel" name="phone" id="contactPhone" placeholder="+91 98765 43210" autoComplete="tel" maxLength={30} />
      </div>

      <div className="field">
        <label htmlFor="interestSelect">Interested in</label>
        <select name="interest" id="interestSelect" defaultValue={options[0]}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="contactMessage">Message</label>
        <textarea name="message" id="contactMessage" rows={3} placeholder="Tell us about your goals or project" required></textarea>
      </div>

      {status === 'error' && (
        <p className="modal-error show">{errorMsg || 'Something went wrong sending that, please try again, or email us directly.'}</p>
      )}

      <button type="submit" className="btn-primary" disabled={status === 'submitting'} style={{ border: 'none', cursor: 'pointer' }}>
        {status === 'submitting' ? 'Sending…' : 'Send Enquiry'}
      </button>
    </form>
  );
}
