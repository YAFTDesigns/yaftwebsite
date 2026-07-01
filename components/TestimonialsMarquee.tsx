'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './TestimonialsMarquee.module.css';

type Testimonial = {
  quote: string;
  name: string;
  title: string;
  linkedin: string;
  instagram: string;
  show_social: boolean;
  photo_url: string;
  rating: number;
};

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<span key={i} style={{ color: 'var(--brass)' }}>★</span>);
    } else if (rating >= i - 0.5) {
      stars.push(
        <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>★</span>
          <span style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', color: 'var(--brass)' }}>★</span>
        </span>
      );
    } else {
      stars.push(<span key={i} style={{ color: 'rgba(255,255,255,0.15)' }}>★</span>);
    }
  }
  return <div style={{ fontSize: 16, letterSpacing: 2, marginBottom: 10 }}>{stars}</div>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function initials(name: string) {
  if (!name || name === 'Anonymous') return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, photo_url }: { name: string; photo_url: string }) {
  if (photo_url) {
    return (
      <div className={styles.avatarWrap}>
        <Image src={photo_url} alt={name} width={40} height={40} className={styles.avatarImg} />
      </div>
    );
  }
  return <div className={styles.avatar}>{initials(name)}</div>;
}

export default function TestimonialsMarquee() {
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/testimonials', { signal: controller.signal })
      .then(r => r.json())
      .then(({ data }) => {
        if (data && data.length > 0) {
          const fromDb: Testimonial[] = data.map((t: any) => ({
            quote: t.quote,
            name: t.name,
            title: t.institution ? `${t.role}, ${t.institution}` : t.role,
            linkedin: t.linkedin_url || '',
            instagram: t.instagram_url || '',
            show_social: t.show_social || false,
            photo_url: t.photo_url || '',
            rating: t.rating || 5.0,
          }));
          setItems(pickRandom(fromDb, 15));
        }
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, []);

  const doubled = [...items, ...items];

  return (
    <section className={styles.section}>
      <div className="wrap">
        <div className="eyebrow">WHAT STUDENTS SAY</div>
        <div className="section-head">
          <h2>Verified by the people who took the course.</h2>
          <p className="note">From students and professionals who have trained with YAFT Designs.</p>
        </div>
      </div>
      <div className={styles.trackWrap}>
        <div className={styles.track}>
          {doubled.map((t, i) => (
            <div className={styles.card} key={i}>
              <div className={styles.alumniBadge}>YAFT Designs Alumni</div>
              {renderStars(t.rating)}
              <p className={styles.quote}>{t.quote}</p>
              <div className={styles.person}>
                <Avatar name={t.name} photo_url={t.photo_url} />
                <div>
                  <div className={styles.name}>{t.name}</div>
                  <div className={styles.role}>{t.title}</div>
                  {t.show_social && t.linkedin && (
                    <a href={t.linkedin} target="_blank" rel="noopener" className={styles.liLink}>LinkedIn ↗</a>
                  )}
                  {t.show_social && !t.linkedin && t.instagram && (
                    <a href={t.instagram} target="_blank" rel="noopener" className={styles.liLink}>Instagram ↗</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
