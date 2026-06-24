'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';

type ContactFormProps = {
  options: string[];
};

export default function ContactForm({ options }: ContactFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const interest = data.get('interest');

    setStatus('submitting');
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          interest,
          message: data.get('message'),
        }),
      });
      if (!res.ok) throw new Error('request failed');
      track('enquiry_submit', { meta: { interest } });
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
        <label>Name</label>
        <input type="text" name="name" placeholder="Your name" required />
      </div>

      <div className="field">
        <label>Email</label>
        <input type="email" name="email" placeholder="you@studio.com" required />
      </div>

      <div className="field">
        <label>Interested in</label>
        <select name="interest" id="interestSelect" defaultValue={options[0]}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Message</label>
        <textarea name="message" rows={3} placeholder="Tell us about your goals or project" required></textarea>
      </div>

      {status === 'error' && (
        <p className="modal-error show">Something went wrong sending that, please try again, or email us directly.</p>
      )}

      <button type="submit" className="btn-primary" disabled={status === 'submitting'} style={{ border: 'none', cursor: 'pointer' }}>
        {status === 'submitting' ? 'Sending…' : 'Send Enquiry'}
      </button>
    </form>
  );
}
