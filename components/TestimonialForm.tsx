'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './TestimonialForm.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COURSES = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Rhino3D for AEC and Climate Design',
  'Wearables and Product Design',
  'Industrial Design',
  'Workshop / Other',
];

export default function TestimonialForm() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [form, setForm] = useState({
    name: '', role: '', institution: '', course_taken: '',
    quote: '', linkedin_url: '', instagram_url: '',
  });

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.role || !form.quote) return;
    setStatus('submitting');
    const { error } = await supabase.from('testimonials').insert([{
      ...form,
      status: 'pending',
    }]);
    if (error) {
      setStatus('error');
    } else {
      setStatus('success');
    }
  }

  if (!open) return (
    <div className={styles.triggerWrap}>
      <button className={styles.trigger} onClick={() => setOpen(true)}>
        Leave a testimonial
      </button>
    </div>
  );

  if (status === 'success') return (
    <div className={styles.successBox}>
      <div className={styles.successIcon}>✓</div>
      <p className={styles.successTitle}>Thank you.</p>
      <p className={styles.successNote}>
        Your testimonial has been received and will appear here once reviewed.
      </p>
    </div>
  );

  return (
    <div className={styles.formWrap}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>Share your experience</h3>
        <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">✕</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Full name <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ar. Priya Sharma"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Role <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              value={form.role}
              onChange={e => set('role', e.target.value)}
              placeholder="Architect, BIM Lead, Student..."
              required
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Institution / Company</label>
            <input
              className={styles.input}
              value={form.institution}
              onChange={e => set('institution', e.target.value)}
              placeholder="VIT Vellore, AAD Architects..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Course taken</label>
            <select
              className={styles.input}
              value={form.course_taken}
              onChange={e => set('course_taken', e.target.value)}
            >
              <option value="">Select a course</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Your testimonial <span className={styles.req}>*</span></label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={form.quote}
            onChange={e => set('quote', e.target.value)}
            placeholder="Share what you learned and how the training helped you..."
            rows={4}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>LinkedIn URL</label>
            <input
              className={styles.input}
              value={form.linkedin_url}
              onChange={e => set('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
              type="url"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Instagram URL</label>
            <input
              className={styles.input}
              value={form.instagram_url}
              onChange={e => set('instagram_url', e.target.value)}
              placeholder="https://instagram.com/..."
              type="url"
            />
          </div>
        </div>

        <p className={styles.notice}>
          Your testimonial will be reviewed before it appears on the site. Only your name, role, and quote will be shown publicly.
        </p>

        {status === 'error' && (
          <p className={styles.errorMsg}>Something went wrong. Please try again or email us directly.</p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" className={styles.submitBtn} disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting...' : 'Submit testimonial'}
          </button>
        </div>
      </form>
    </div>
  );
}
