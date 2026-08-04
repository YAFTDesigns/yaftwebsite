'use client';

import { useState, useRef } from 'react';
import styles from './TestimonialForm.module.css';

const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || '';

export default function TestimonialForm({ source }: { source?: string }) {
  const [stage, setStage] = useState<'trigger' | 'choice' | 'form'>('trigger');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    role: '',
    institution: '',
    course_taken: '',
    quote: '',
    linkedin_url: '',
    show_social: false,
  });

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be under 2MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role || !form.quote) return;
    setStatus('submitting');

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('role', form.role);
    fd.append('institution', form.institution);
    fd.append('course_taken', form.course_taken);
    fd.append('quote', form.quote);
    fd.append('linkedin_url', form.linkedin_url);
    fd.append('show_social', String(form.show_social));
    fd.append('rating', String(rating || 5.0));
    if (source) fd.append('source', source);
    if (photoFile) fd.append('photo', photoFile);

    const res = await fetch('/api/testimonials', { method: 'POST', body: fd });
    setStatus(res.ok ? 'success' : 'error');
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  // Stage 1: trigger button
  if (stage === 'trigger') return (
    <div className={styles.triggerWrap}>
      <button className={styles.trigger} onClick={() => setStage(GOOGLE_REVIEW_URL ? 'choice' : 'form')}>
        Share your experience
      </button>
    </div>
  );

  // Stage 2: upfront choice, Google or write here (skipped entirely if no review link configured)
  if (stage === 'choice') return (
    <div className={styles.formWrap}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>Share your experience</h3>
        <button className={styles.closeBtn} onClick={() => setStage('trigger')} aria-label="Close">✕</button>
      </div>
      <div className={styles.choiceBody}>
        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className={styles.choiceCard}>
          <svg className={styles.choiceGoogleIcon} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <div>
            <div className={styles.choiceCardTitle}>Share on Google review</div>
            <div className={styles.choiceCardNote}>Opens Google in a new tab, takes 30 seconds</div>
          </div>
        </a>
        <div className={styles.choiceOr}>or</div>
        <button type="button" className={styles.choiceCard} onClick={() => setStage('form')}>
          <span className={styles.choiceWriteIcon}>✎</span>
          <div>
            <div className={styles.choiceCardTitle}>Write it here</div>
            <div className={styles.choiceCardNote}>Appears on this site once reviewed</div>
          </div>
        </button>
      </div>
    </div>
  );

  if (status === 'success') return (
    <div className={styles.successBox}>
      <div className={styles.successIcon}>✦</div>
      <p className={styles.successTitle}>Thank you for sharing.</p>
      <p className={styles.successNote}>
        Your words mean more than you know. It is a privilege to have been part of your learning journey.
      </p>
      {GOOGLE_REVIEW_URL && (
        <div className={styles.googleNudge}>
          <p className={styles.googleNudgeText}>
            Mind sharing this on Google too? It takes 20 seconds since you&apos;ve already written it, and it genuinely helps other students find us.
          </p>
          <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className={styles.googleBtn}>
            <svg className={styles.googleG} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Leave a Google review
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.formWrap}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>Share your experience</h3>
        <button className={styles.closeBtn} onClick={() => setStage('trigger')} aria-label="Close">✕</button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>

        {/* Photo upload */}
        <div className={styles.photoRow}>
          <div
            className={styles.photoCircle}
            onClick={() => fileRef.current?.click()}
            title="Upload a photo"
          >
            {photoPreview
              ? <img src={photoPreview} alt="Preview" className={styles.photoImg} />
              : <span className={styles.photoInitials}>{form.name ? initials(form.name) : '+'}</span>
            }
          </div>
          <div>
            <p className={styles.photoHint}>Profile photo</p>
            <button type="button" className={styles.photoBtn} onClick={() => fileRef.current?.click()}>
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className={styles.photoNote}>JPG or PNG, max 2MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
        </div>

        {/* Name + Role */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Current designation <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              value={form.role}
              onChange={e => set('role', e.target.value)}
              placeholder="Architect, BIM Lead, M.Arch Student..."
              required
            />
          </div>
        </div>

        {/* Institution + Course */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Institution or company</label>
            <input
              className={styles.input}
              value={form.institution}
              onChange={e => set('institution', e.target.value)}
              placeholder="VIT Vellore, AAD Architects..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Course or workshop attended</label>
            <input
              className={styles.input}
              value={form.course_taken}
              onChange={e => set('course_taken', e.target.value)}
              placeholder="IIT Kharagpur 2025 workshop, Grasshopper course..."
            />
          </div>
        </div>

        {/* Star rating */}
        <div className={styles.field}>
          <label className={styles.label}>Your rating</label>
          <div className={styles.starsInput}>
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={styles.starWrap}
                onMouseLeave={() => setHoverRating(0)}
              >
                {/* Left half */}
                <span
                  className={`${styles.starHalf} ${styles.starLeft} ${(hoverRating || rating) >= star - 0.5 ? styles.starActive : ''}`}
                  onMouseEnter={() => setHoverRating(star - 0.5)}
                  onClick={() => setRating(star - 0.5)}
                >
                  ★
                </span>
                {/* Right half */}
                <span
                  className={`${styles.starHalf} ${styles.starRight} ${(hoverRating || rating) >= star ? styles.starActive : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              </span>
            ))}
            <span className={styles.ratingVal}>
              {(hoverRating || rating) > 0 ? `${(hoverRating || rating).toFixed(1)} / 5` : ''}
            </span>
          </div>
        </div>

        {/* Quote */}
        <div className={styles.field}>
          <label className={styles.label}>Your testimonial <span className={styles.req}>*</span></label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={form.quote}
            onChange={e => set('quote', e.target.value.slice(0, 200))}
            placeholder="Share what you learned and how the training helped you..."
            rows={4}
            maxLength={200}
            required
          />
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: form.quote.length > 180 ? 'var(--brass)' : 'var(--ink-soft)',
            textAlign: 'right',
            marginTop: 4,
            opacity: form.quote.length === 0 ? 0.4 : 1,
          }}>
            {form.quote.length} / 200
          </div>
        </div>

        {/* LinkedIn */}
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

        {/* Consent checkbox */}
        {form.linkedin_url && (
          <label className={styles.consentRow}>
            <input
              type="checkbox"
              checked={form.show_social}
              onChange={e => set('show_social', e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.consentText}>
              I am okay with my LinkedIn being shown publicly on the site alongside my testimonial.
            </span>
          </label>
        )}

        <p className={styles.notice}>
          Your testimonial will be reviewed before it appears on the site. Only your name, designation, photo, and quote are shown publicly. Your LinkedIn is kept private unless you opt in above.
        </p>

        {status === 'error' && (
          <p className={styles.errorMsg}>Something went wrong. Please try again or email us directly.</p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => setStage('trigger')}>Cancel</button>
          <button type="submit" className={styles.submitBtn} disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting...' : 'Submit testimonial'}
          </button>
        </div>
      </form>
    </div>
  );
}
