'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ServicesCarousel.module.css';

type Service = {
  title: string;
  kicker: string;
  color: string;
  body: string;
  points: string[];
};

const SERVICES: Service[] = [
  {
    title: 'One-on-One Training',
    kicker: 'Individual',
    color: '#40E0D0',
    body: 'Paced to your project or portfolio, in person in Coimbatore or remote. Built around what you are actually working on, not a generic syllabus.',
    points: [
      'Rhino3D, Grasshopper, Rhino.Inside.Revit',
      'Sessions built around your live project',
      'Flexible pacing, 1:1 or small cohort',
      'Direct feedback on your own scripts and models',
      'Available online across India',
    ],
  },
  {
    title: 'Institutional & Corporate Training',
    kicker: 'Programs',
    color: '#E6A817',
    body: 'Multi-day or semester-length programs for architecture schools and design firms, delivered on campus or online. Curriculum shaped to your context.',
    points: [
      'Conducted at IIT Kharagpur, VIT, ASADI, NIT Trichy',
      'Parametric design, fabrication, climate analysis',
      'Runs from single-day intensives to full electives',
      'Customised to institution curriculum',
      'Certificates issued on completion',
    ],
  },
  {
    title: 'Expert Mentorship',
    kicker: 'Faculty',
    color: '#A78BFA',
    body: 'Embedded visiting faculty for schools adding Rhino and Grasshopper to their curriculum. Semester-length or elective module format at B.Arch and M.Arch levels.',
    points: [
      'Currently at VIT Vellore and ASADI College',
      'Semester-length or elective module format',
      'Curriculum shaped around department needs',
      'M.Arch and B.Arch levels',
      'Open to new institutional partnerships',
    ],
  },
  {
    title: 'Computational Consulting',
    kicker: 'Industry',
    color: '#E63946',
    body: 'Panel rationalization, facade scripting, and fabrication documentation for studios and contractors. Active on projects across five countries.',
    points: [
      'Double-curved surface rationalization',
      'Shop drawing automation via Grasshopper',
      'Rhino.Inside.Revit BIM integration',
      'Deliverables handed off fabrication-ready',
      'Active on projects across 5 countries',
    ],
  },
];

type BgImage = {
  src: string;
  alt: string;
  duration: number;
};

const BG_IMAGES: BgImage[] = [
  { src: '/assets/images/services-loop/kinetic-facade-panels.jpg', alt: 'Kinetic parametric facade panel system', duration: 8000 },
  { src: '/assets/images/services-loop/facade-pattern-diagram.jpg', alt: 'Facade panel tessellation pattern study', duration: 8000 },
  { src: '/assets/images/services-hero-1.jpg', alt: 'Rhino and Grasshopper training session', duration: 5000 },
  { src: '/assets/images/services-hero-2.jpg', alt: 'Rhinoceros software workshop presentation', duration: 5000 },
];

export default function ServicesCarousel() {
  const [current, setCurrent] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bgIndex, setBgIndex] = useState(0);
  const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Respect reduced-motion preference: stop auto-advancing, first card just stays put.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        setExitingIndex(prev);
        setTimeout(() => setExitingIndex(null), 1000);
        return (prev + 1) % SERVICES.length;
      });
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // Background image loop, additional layer over the looping video. Each image
    // holds for its own duration (new facade shots run longer than the rest).
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const advance = () => {
      bgTimerRef.current = setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % BG_IMAGES.length);
      }, BG_IMAGES[bgIndex].duration);
    };
    advance();

    return () => {
      if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
    };
  }, [bgIndex]);

  return (
    <div className={styles.section}>
      <video
        className={styles.bgVideo}
        autoPlay
        muted
        loop
        playsInline
        poster="/assets/video/services-bg-poster.jpg"
      >
        <source src="/assets/video/services-bg.webm" type="video/webm" />
        <source src="/assets/video/services-bg.mp4" type="video/mp4" />
      </video>

      <div className={styles.bgImageLoop}>
        {BG_IMAGES.map((img, i) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            className={`${styles.bgImage} ${i === bgIndex ? styles.bgImageVisible : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
      </div>

      <div className={styles.bgFade} />

      <div className={styles.inner}>
        <div className={styles.track}>
          {SERVICES.map((svc, i) => {
            const isActive = i === current;
            const isExiting = i === exitingIndex;
            return (
              <div
                key={svc.title}
                className={`${styles.card} ${isActive ? styles.active : ''} ${isExiting ? styles.exiting : ''}`}
              >
                <span className={styles.cardKicker} style={{ color: svc.color }}>{svc.kicker}</span>
                <h3 className={styles.cardTitle} style={{ color: svc.color }}>{svc.title}</h3>
                <p className={styles.cardBody}>{svc.body}</p>
                <div className={styles.cardDivider} />
                <ul className={styles.cardList}>
                  {svc.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

        <div className={styles.dots}>
          {SERVICES.map((svc, i) => (
            <span key={svc.title} className={`${styles.dot} ${i === current ? styles.dotActive : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
