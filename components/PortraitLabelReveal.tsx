'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../app/home.module.css';

// Reveal for the background label behind the founder portrait: slides
// up from below and stays IN FRONT of the photo (z-index never drops
// behind it). Bidirectional -- scrolling the section into view plays
// it forward, scrolling back out (either direction) reverses it, since
// the observer keeps watching instead of disconnecting after one fire.
export default function PortraitLabelReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} aria-hidden="true" className={`${styles.portraitLabel} ${visible ? styles.portraitLabelVisible : ''}`}>
      {children}
    </span>
  );
}
