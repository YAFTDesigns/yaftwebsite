'use client';

import { useEffect } from 'react';

export default function CarouselDrag({ id }: { id: string }) {
  useEffect(() => {
    const track = document.getElementById(id);
    if (!track) return;

    /* ── Mouse drag (desktop only) ──
       Touch devices are deliberately left untouched: overflow-x:auto
       already gives native touch-scrolling for free, and native
       handles momentum/rubber-banding far better than any JS
       reimplementation. A previous version of this component also
       intercepted touchmove to add custom momentum, but that
       conflicted with native scroll handling on real devices and
       made the carousel feel stuck/unresponsive to touch. */
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
      const atStart = track.scrollLeft === 0;
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      if ((atStart && e.deltaY < 0) || (atEnd && e.deltaY > 0)) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY + e.deltaX;
    };

    /* ── Prevent link clicks after a mouse-drag (desktop only) ── */
    track.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => { if (didDrag) e.preventDefault(); });
    });

    track.style.cursor = 'grab';

    track.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    track.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      track.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      track.removeEventListener('wheel', onWheel);
    };
  }, [id]);

  return null;
}
