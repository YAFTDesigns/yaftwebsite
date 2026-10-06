'use client';

import { useEffect, useRef, useState } from 'react';

// Courses hero: alternates between the existing background image and a short
// Rhino/Grasshopper screen recording. Image shows first, the clip fades in and
// plays once, then fades back to the image, and the cycle repeats. For
// reduced-motion or data-saver visitors the clip never loads or plays.
const IMAGE_MS = 7000;
const FADE_MS = 1200;

export default function CoursesHeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || nav.connection?.saveData) return;
    const v = ref.current;
    if (!v) return;
    let t: ReturnType<typeof setTimeout>;
    const loadT = setTimeout(() => v.load(), 2500);
    const start = () => {
      v.currentTime = 0;
      v.play().then(() => setOn(true)).catch(() => { t = setTimeout(start, IMAGE_MS); });
    };
    const onEnded = () => {
      setOn(false);
      t = setTimeout(() => { v.pause(); start(); }, IMAGE_MS + FADE_MS);
    };
    v.addEventListener('ended', onEnded);
    t = setTimeout(start, IMAGE_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(loadT);
      v.removeEventListener('ended', onEnded);
      v.pause();
    };
  }, []);

  return (
    <video
      ref={ref}
      muted
      playsInline
      preload="none"
      poster="/assets/video/courses-hero-poster.jpg"
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        zIndex: -2, opacity: on ? 1 : 0, transition: `opacity ${FADE_MS}ms ease`,
        filter: 'saturate(0.85) brightness(0.9)', pointerEvents: 'none',
      }}
    >
      <source src="/assets/video/courses-hero.mp4" type="video/mp4" />
    </video>
  );
}
