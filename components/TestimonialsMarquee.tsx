'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import styles from './TestimonialsMarquee.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const HARDCODED = [
  {
    quote: 'I joined YAFT Designs for training in Rhino and Grasshopper, and the learning experience was truly fantastic. Sir is an exceptionally skilled and professional tutor with deep expertise in computational design.',
    name: 'Harish Ragaventhra',
    title: 'Architect, Rajalakshmi School of Architecture',
    linkedin: 'https://www.linkedin.com/in/harish-ragaven-b3487636a',
    instagram: '',
    show_social: true,
    photo_url: '',
    rating: 5.0,
  },
  {
    quote: 'I recently attended the Rhino software class conducted by Ar. Yokes from YAFT Designs, and I was thoroughly impressed. His patience and dedication stood out the most.',
    name: 'Lokhesh',
    title: 'Architect',
    linkedin: '',
    instagram: 'https://www.instagram.com/lok_hesh',
    show_social: true,
    photo_url: '',
    rating: 5.0,
  },
  {
    quote: 'You have been my first point of contact whenever I was stuck, had questions, or needed guidance. I have learned a lot working with you, and those lessons will stay with me.',
    name: 'Sambram Raam',
    title: 'BIM Lead, AAD Architects, Chennai',
    linkedin: 'https://www.linkedin.com/in/sambramraam',
    instagram: '',
    show_social: true,
    photo_url: '',
    rating: 5.0,
  },
  {
    quote: 'The course was well formatted for architects to design and work with Rhino. Yokes, as an instructor, was well-learned and a clear communicator.',
    name: 'Ar. Gangotri',
    title: 'Architect',
    linkedin: '',
    instagram: 'https://www.instagram.com/unravellingarchitecture',
    show_social: true,
    photo_url: '',
    rating: 5.0,
  },
  {
    quote: 'The training approach at YAFT Designs is genuinely industry-oriented. Students are exposed to real computational workflows that directly translate to professional practice.',
    name: 'Ar. Chandrasekaran C',
    title: 'Architecture Professor, VIT Vellore',
    linkedin: 'https://www.linkedin.com/in/chandrasekaran-c-bb1b9128b/',
    instagram: '',
    show_social: true,
    photo_url: '',
    rating: 5.0,
  },
];

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
  const [items, setItems] = useState<Testimonial[]>(HARDCODED);

  useEffect(() => {
    // Shuffle hardcoded on mount
    setItems(shuffle(HARDCODED));

    supabase
      .from('testimonials')
      .select('name, role, institution, quote, linkedin_url, instagram_url, show_social, photo_url, rating')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(50) // fetch up to 50, then randomly pick 15
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
          // Merge all, shuffle, pick max 15
          const merged = [...HARDCODED, ...fromDb];
          setItems(pickRandom(merged, 15));
        }
      });
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
