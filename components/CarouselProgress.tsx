'use client';

import { useEffect, useRef } from 'react';
import styles from './CarouselProgress.module.css';

export default function CarouselProgress({ trackId }: { trackId: string }) {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = document.getElementById(trackId);
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    function update() {
      if (!track || !thumb) return;
      const scrollable = track.scrollWidth - track.clientWidth;
      if (scrollable <= 0) return;
      const progress = track.scrollLeft / scrollable;
      const trackWidth = thumb.parentElement!.clientWidth;
      const thumbWidth = Math.max(40, trackWidth * (track.clientWidth / track.scrollWidth));
      const maxLeft = trackWidth - thumbWidth;
      thumb.style.width = `${thumbWidth}px`;
      thumb.style.transform = `translateX(${progress * maxLeft}px)`;
    }

    update();
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      track.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [trackId]);

  return (
    <div className={styles.track}>
      <div className={styles.thumb} ref={thumbRef} />
    </div>
  );
}
