'use client';

import { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './TestimonialForm.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TestimonialForm() {
  const [open, setOpen] = useState(false);
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
    instagram_url: '',
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

  async function uploadPhoto(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const path = `testimonials/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('public-assets')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) return null;
    const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role || !form.quote) return;
    setStatus('submitting');

    let photo_url: string | null = null;
    if (photoFile) {
      photo_url = await uploadPhoto(photoFile);
    }

    const { error } = await supabase.from('testimonials').insert([{
      name: form.name.trim() || 'Anonymous',
      role: form.role,
      institution: form.institution,
      course_taken: form.course_taken,
      quote: form.quote,
      linkedin_url: form.linkedin_url,
      instagram_url: form.instagram_url,
      show_social: form.show_social,
      photo_url,
      rating: rating || 5.0,
      status: 'pending',
    }]);

    setStatus(error ? 'error' : 'success');
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  if (!open) return (
    <div className={styles.triggerWrap}>
      <button className={styles.trigger} onClick={() => setOpen(true)}>
        Share your experience
      </button>
    </div>
  );

  if (status === 'success') return (
    <div className={styles.successBox}>
      <div className={styles.successIcon}>✦</div>
      <p className={styles.successTitle}>Thank you for sharing.</p>
      <p className={styles.successNote}>
        Your words mean more than you know. It is a privilege to have been part of your learning journey.
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
            <p className={styles.photoHint}>Profile photo (optional)</p>
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

        {/* Social links */}
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

        {/* Consent checkbox */}
        {(form.linkedin_url || form.instagram_url) && (
          <label className={styles.consentRow}>
            <input
              type="checkbox"
              checked={form.show_social}
              onChange={e => set('show_social', e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.consentText}>
              I am okay with my LinkedIn or Instagram being shown publicly on the site alongside my testimonial.
            </span>
          </label>
        )}

        <p className={styles.notice}>
          Your testimonial will be reviewed before it appears on the site. Only your name, designation, photo, and quote are shown publicly. Your social links are kept private unless you opt in above.
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
