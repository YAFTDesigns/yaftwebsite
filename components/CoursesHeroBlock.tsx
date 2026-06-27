'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './CoursesHeroBlock.module.css';

type HoverState = 'none' | 'rhino' | 'gh' | 'rir';

export default function CoursesHeroBlock() {
  const [hovered, setHovered] = useState<HoverState>('none');
  const [headingBlur, setHeadingBlur] = useState(10);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- heading blur on load ---------- */
  useEffect(() => {
    focusTimer.current = setTimeout(() => setHeadingBlur(0), 600);
    return () => { if (focusTimer.current) clearTimeout(focusTimer.current); };
  }, []);

  /* ---------- logo hover handlers ---------- */
  function onEnter(logo: HoverState) {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHeadingBlur(6);
    setHovered(logo);
    setTimeout(() => setHeadingBlur(0), 350);
  }

  function onLeave() {
    setHeadingBlur(6);
    leaveTimer.current = setTimeout(() => {
      setHovered('none');
      setTimeout(() => setHeadingBlur(0), 350);
    }, 250);
  }

  const blurStyle = { filter: headingBlur > 0 ? `blur(${headingBlur}px)` : undefined,
                      transition: 'filter 1.1s ease, opacity 0.3s ease, transform 0.3s ease' };

  return (
    <div className={styles.coursesHero}>


      <div className={styles.inner}>


        {/* reactive heading */}
        <div className={styles.headingWrap}>
          <h2 style={{ ...blurStyle, opacity: hovered === 'none' ? 1 : 0, transform: hovered === 'none' ? 'translateY(0)' : 'translateY(-8px)' }}>
            Live Masterclasses in<br />Computational Design
          </h2>
          <h2 style={{ ...blurStyle, opacity: hovered === 'rhino' ? 1 : 0, transform: hovered === 'rhino' ? 'translateY(0)' : 'translateY(8px)' }}>
            <span className={styles.crimson}>Rhino</span><span>ceros</span> Masterclass
          </h2>
          <h2 style={{ ...blurStyle, opacity: hovered === 'gh' ? 1 : 0, transform: hovered === 'gh' ? 'translateY(0)' : 'translateY(8px)' }}>
            <span className={styles.green}>Grass</span><span>hopper</span> Masterclass
          </h2>
          <h2 style={{ ...blurStyle, opacity: hovered === 'rir' ? 1 : 0, transform: hovered === 'rir' ? 'translateY(0)' : 'translateY(8px)' }}>
            Rhino.Inside.<span className={styles.blue}>Revit</span> Masterclass
          </h2>
        </div>

        {/* logo row */}
        <div className={styles.logoRow}>
          <div
            className={`${styles.logoBox} ${styles.rhinoBox}`}
            onMouseEnter={() => onEnter('rhino')}
            onMouseLeave={onLeave}
          >
            <img src="/assets/logos/rhino-logo.png" alt="Rhino3D" />
          </div>
          <span className={styles.dot}>●</span>
          <div
            className={`${styles.logoBox} ${styles.ghBox}`}
            onMouseEnter={() => onEnter('gh')}
            onMouseLeave={onLeave}
          >
            <img src="/assets/logos/grasshopper-logo.jpg" alt="Grasshopper" />
          </div>
          <span className={styles.dot}>●</span>
          <div
            className={`${styles.logoBox} ${styles.rirBox}`}
            onMouseEnter={() => onEnter('rir')}
            onMouseLeave={onLeave}
          >
            <img src="/assets/logos/rhino-inside-revit-logo.png" alt="Rhino.Inside.Revit" />
          </div>
        </div>

        <p className={styles.note}>
          <Link href="/courses" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>
            See the full list →
          </Link>
        </p>
      </div>
    </div>
  );
}
