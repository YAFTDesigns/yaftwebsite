'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../app/home.module.css';

// Two-stage reveal for the background label behind the founder portrait:
// slides up from below and sits IN FRONT of the photo while entering,
// then once settled into position, drops behind the photo and its
// opacity eases down to 65% -- same trigger pattern as FadeInOnView
// (IntersectionObserver, disconnect after firing once) but with the
// extra settled stage FadeInOnView doesn't need.
export default function PortraitLabelReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Let the slide-up-in-front animation play out before dropping
    // behind the photo and settling to 65% opacity.
    const timer = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(timer);
  }, [visible]);

  const stateClass = settled ? styles.portraitLabelSettled : visible ? styles.portraitLabelVisible : '';

  return (
    <span ref={ref} aria-hidden="true" className={`${styles.portraitLabel} ${stateClass}`}>
      {children}
    </span>
  );
}
