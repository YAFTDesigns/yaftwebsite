'use client';

import { useEffect, useRef } from 'react';

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
      const railWidth = thumb.parentElement!.clientWidth;
      const thumbWidth = Math.max(40, railWidth * (track.clientWidth / track.scrollWidth));
      const maxLeft = railWidth - thumbWidth;
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
    <div style={{
      position: 'relative',
      width: '120px',
      height: '2px',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '2px',
      margin: '20px auto 0',
      overflow: 'hidden',
    }}>
      <div ref={thumbRef} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '40px',
        background: 'rgba(255,255,255,0.35)',
        borderRadius: '2px',
        transition: 'transform 0.08s linear',
        willChange: 'transform',
      }} />
    </div>
  );
}
