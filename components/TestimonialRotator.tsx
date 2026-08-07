'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './TestimonialRotator.module.css';

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  institution: string | null;
  quote: string;
  rating: number | null;
};

export default function TestimonialRotator({ testimonials }: { testimonials: Testimonial[] }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (testimonials.length <= 1) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % testimonials.length);
        setVisible(true);
      }, 400);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;
  const t = testimonials[current];

  return (
    <div className={styles.testiCard}>
      <div className={`${styles.fadeGroup} ${visible ? styles.fadeVisible : ''}`}>
        <div className={styles.testiStars}>{'★'.repeat(Math.round(t.rating ?? 5))}</div>
        <div className={styles.testiQuote}>&quot;{t.quote}&quot;</div>
        <div className={styles.testiName}>{t.name}</div>
        {(t.role || t.institution) && (
          <div className={styles.testiRole}>
            {[t.role, t.institution].filter(Boolean).join(', ')}
          </div>
        )}
      </div>

      {testimonials.length > 1 && (
        <div className={styles.dots}>
          {testimonials.map((item, i) => (
            <span key={item.id} className={`${styles.dot} ${i === current ? styles.dotActive : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
