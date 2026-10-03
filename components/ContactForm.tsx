'use client';

import { useState } from 'react';
import { track, getSessionId } from '@/lib/analytics';
import { AUDIENCES, AUDIENCE_LABELS, audienceToSegment, type Audience, type Funnel } from '@/lib/enquiryFields';

type ContactFormProps = {
  options: string[];
  // Set on a funnel page: fixes the path and limits the audience choices.
  funnel?: Funnel;
  messagePlaceholder?: string;
};

const FUNNEL_AUDIENCES: Record<Funnel, Audience[]> = {
  individual: ['student', 'professional'],
  college: ['college'],
  corporate: ['company'],
  consulting: ['company'],
};

export default function ContactForm({ options, funnel, messagePlaceholder }: ContactFormProps) {
  const audiences = funnel ? FUNNEL_AUDIENCES[funnel] : [...AUDIENCES];
  const [audience, setAudience] = useState<Audience>(audiences[0]);
  const needsOrg = audience === 'college' || audience === 'company';
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const interest = data.get('interest');
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
          audience,
          segment: audienceToSegment(audience),
          funnel,
          need: interest,
          organisation: needsOrg ? String(data.get('organisation') ?? '').trim() : undefined,
          sourcePage: window.location.pathname,
          details: funnel === 'college' ? Object.fromEntries(['role', 'participants', 'duration', 'dates', 'city'].map((k) => [k, String(data.get(`d_${k}`) ?? '').trim()])) : undefined,
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
      track('enquiry_submit', { meta: { interest, segment: audienceToSegment(audience), audience, ...(funnel ? { funnel } : {}) } });
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
        <label htmlFor="contactSegment">I am a</label>
        <select name="audience" id="contactSegment" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
          {audiences.map((a) => (
            <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
          ))}
        </select>
      </div>

      {needsOrg && (
        <div className="field">
          <label htmlFor="contactOrg">{audience === 'college' ? 'College or university name' : 'Company name'}</label>
          <input type="text" name="organisation" id="contactOrg" maxLength={120} required />
        </div>
      )}

      {funnel === 'college' && (
        <>
          <div className="field">
            <label htmlFor="d_role">Your role</label>
            <input type="text" name="d_role" id="d_role" maxLength={120} placeholder="Dean, HOD, faculty coordinator" />
          </div>
          <div className="field">
            <label htmlFor="d_city">City and country</label>
            <input type="text" name="d_city" id="d_city" maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="d_participants">Estimated participants</label>
            <input type="text" name="d_participants" id="d_participants" maxLength={120} placeholder="e.g. 40 students" />
          </div>
          <div className="field">
            <label htmlFor="d_duration">Preferred duration</label>
            <input type="text" name="d_duration" id="d_duration" maxLength={120} placeholder="e.g. 3 days, one semester" />
          </div>
          <div className="field">
            <label htmlFor="d_dates">Preferred dates</label>
            <input type="text" name="d_dates" id="d_dates" maxLength={120} placeholder="e.g. January 2027" />
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="contactPhone">Phone or WhatsApp (optional)</label>
        <input type="tel" name="phone" id="contactPhone" placeholder="+91 98765 43210" autoComplete="tel" maxLength={30} />
      </div>

      <div className="field">
        <label htmlFor="interestSelect">What do you need?</label>
        <select name="interest" id="interestSelect" defaultValue={options[0]}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="contactMessage">Message</label>
        <textarea name="message" id="contactMessage" rows={3} placeholder={messagePlaceholder ?? (needsOrg ? 'Tell us about your team or students, and what you want to achieve' : 'Tell us about your goals, background and any experience with Rhino or Grasshopper')} required></textarea>
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
