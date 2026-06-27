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
      // only hijack when scroll is more horizontal than vertical,
      // or when track can still scroll horizontally
      const atStart = track.scrollLeft === 0;
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return; // let page scroll
      e.preventDefault();
      track.scrollLeft += e.deltaY + e.deltaX;
    };

    /* ── Touch (mobile) ── */
    let touchStartX = 0;
    let touchScrollLeft = 0;
    let touchDidMove = false;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchScrollLeft = track.scrollLeft;
      touchDidMove = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = touchStartX - e.touches[0].clientX;
      if (Math.abs(dx) > 8) {
        touchDidMove = true;
        e.preventDefault(); // stop page scroll while swiping carousel
        track.scrollLeft = touchScrollLeft + dx;
      }
    };
    const onTouchEnd = () => { touchDidMove = false; };

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
