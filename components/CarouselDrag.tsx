'use client';

import { useEffect } from 'react';

export default function CarouselDrag({ id }: { id: string }) {
  useEffect(() => {
    const track = document.getElementById(id);
    if (!track) return;
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let didDrag = false;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      didDrag = false;
      startX = e.pageX - (track.getBoundingClientRect().left);
      scrollLeft = track.scrollLeft;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const x = e.pageX - track.getBoundingClientRect().left;
      const walk = (x - startX) * 1.2;
      if (Math.abs(walk) > 5) didDrag = true;
      track.scrollLeft = scrollLeft - walk;
    };
    const onMouseUp = () => { isDragging = false; };

    track.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    track.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => { if (didDrag) e.preventDefault(); });
    });

    return () => {
      track.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [id]);

  return null;
}
