'use client';

import { useEffect } from 'react';

export default function CarouselDrag({ id }: { id: string }) {
  useEffect(() => {
    const track = document.getElementById(id);
    if (!track) return;

    /* ── Mouse drag (desktop) ── */
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let didDrag = false;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      didDrag = false;
      startX = e.pageX - track.getBoundingClientRect().left;
      scrollLeft = track.scrollLeft;
      track.style.cursor = 'grabbing';
      cancelMomentum();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const x = e.pageX - track.getBoundingClientRect().left;
      const walk = (x - startX) * 1.2;
      if (Math.abs(walk) > 5) didDrag = true;
      track.scrollLeft = scrollLeft - walk;
    };
    const onMouseUp = () => {
      isDragging = false;
      track.style.cursor = 'grab';
    };

    /* ── Wheel → horizontal scroll (desktop) ── */
    const onWheel = (e: WheelEvent) => {
      const atStart = track.scrollLeft === 0;
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY + e.deltaX;
    };

    /* ── Touch with momentum (mobile) ── */
    let touchStartX = 0;
    let touchScrollLeft = 0;
    let touchDidMove = false;
    let lastTouchX = 0;
    let lastTouchTime = 0;
    let velocity = 0;
    let momentumRaf = 0;

    function cancelMomentum() {
      cancelAnimationFrame(momentumRaf);
      velocity = 0;
    }

    function runMomentum() {
      if (Math.abs(velocity) < 0.5) return;
      track.scrollLeft += velocity;
      velocity *= 0.92; // friction — higher = more glide
      momentumRaf = requestAnimationFrame(runMomentum);
    }

    const onTouchStart = (e: TouchEvent) => {
      cancelMomentum();
      touchStartX = e.touches[0].clientX;
      touchScrollLeft = track.scrollLeft;
      lastTouchX = touchStartX;
      lastTouchTime = Date.now();
      touchDidMove = false;
      velocity = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = touchStartX - e.touches[0].clientX;
      if (Math.abs(dx) > 6) {
        touchDidMove = true;
        e.preventDefault();
        track.scrollLeft = touchScrollLeft + dx;

        // track velocity
        const now = Date.now();
        const dt = now - lastTouchTime || 1;
        velocity = (e.touches[0].clientX - lastTouchX) / dt * 16; // px per frame ~16ms
        lastTouchX = e.touches[0].clientX;
        lastTouchTime = now;
      }
    };

    const onTouchEnd = () => {
      // flip velocity direction (scroll follows finger direction)
      velocity = -velocity;
      momentumRaf = requestAnimationFrame(runMomentum);
      setTimeout(() => { touchDidMove = false; }, 50);
    };

    /* ── Prevent link clicks on drag ── */
    track.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => { if (didDrag || touchDidMove) e.preventDefault(); });
    });

    track.style.cursor = 'grab';

    track.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    track.addEventListener('wheel', onWheel, { passive: false });
    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false });
    track.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelMomentum();
      track.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchmove', onTouchMove);
      track.removeEventListener('touchend', onTouchEnd);
    };
  }, [id]);

  return null;
}
