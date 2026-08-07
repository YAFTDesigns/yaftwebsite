'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './ServicesCarousel.module.css';

type Service = {
  title: string;
  color: string;
  body: string;
  points: string[];
};

const SERVICES: Service[] = [
  {
    title: 'One-on-One Training',
    color: '#40E0D0',
    body: 'Paced to your project or portfolio, in person in Coimbatore or remote. Built around what you are actually working on, not a generic syllabus.',
    points: [
      'Rhino3D, Grasshopper, Rhino.Inside.Revit',
      'Sessions built around your live project',
      'Flexible pacing, 1:1 or small cohort',
      'Available online across India',
    ],
  },
  {
    title: 'Institutional & Corporate Training',
    color: '#E6A817',
    body: 'Multi-day or semester-length programs for architecture schools and design firms, delivered on campus or online. Curriculum shaped to your context.',
    points: [
      'Conducted at IIT Kharagpur, VIT, ASADI, NIT Trichy',
      'Parametric design, fabrication, climate analysis',
      'Customised to institution curriculum',
      'Certificates issued on completion',
    ],
  },
  {
    title: 'Expert Mentorship',
    color: '#A78BFA',
    body: 'Embedded visiting faculty for schools adding Rhino and Grasshopper to their curriculum. Semester-length or elective module format at B.Arch and M.Arch levels.',
    points: [
      'Currently at VIT Vellore and ASADI College',
      'Semester-length or elective module format',
      'M.Arch and B.Arch levels',
      'Open to new institutional partnerships',
    ],
  },
  {
    title: 'Computational Consulting',
    color: '#E63946',
    body: 'Panel rationalization, facade scripting, and fabrication documentation for studios and contractors. Active on projects across five countries.',
    points: [
      'Double-curved surface rationalization',
      'Shop drawing automation via Grasshopper',
      'Rhino.Inside.Revit BIM integration',
      'Active on projects across 5 countries',
    ],
  },
];

export default function ServicesCarousel() {
  const [current, setCurrent] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Respect reduced-motion preference: stop auto-advancing, first card just stays put.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        setExitingIndex(prev);
        setTimeout(() => setExitingIndex(null), 600);
        return (prev + 1) % SERVICES.length;
      });
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
                <h3 className={styles.cardTitle} style={{ color: svc.color }}>{svc.title}</h3>
                <p className={styles.cardBody}>{svc.body}</p>
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
