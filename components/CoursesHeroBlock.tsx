'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './CoursesHeroBlock.module.css';

type HoverState = 'none' | 'rhino' | 'gh' | 'rir';

export default function CoursesHeroBlock() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<HoverState>('none');
  const [headingBlur, setHeadingBlur] = useState(10);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- canvas contour field ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0, t = 0, raf = 0;

    function resize() {
      W = canvas!.width  = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function field(x: number, y: number, t: number) {
      const nx = x / W, ny = y / H;
      return (
        Math.sin(nx * 4.2 + t * 0.45) * 0.4 +
        Math.sin(ny * 3.8 - t * 0.3)  * 0.4 +
        Math.sin((nx + ny) * 3.1 + t * 0.25) * 0.2 +
        Math.sin((nx - ny) * 2.7 - t * 0.35) * 0.2 +
        Math.sin(Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 6 - t * 0.5) * 0.3
      );
    }

    const LEVELS = 18, GRID = 3;

    function drawContours() {
      ctx.clearRect(0, 0, W, H);
      for (let level = 0; level < LEVELS; level++) {
        const iso = -1 + (level / (LEVELS - 1)) * 2;
        ctx.beginPath();
        for (let x = 0; x < W - GRID; x += GRID) {
          for (let y = 0; y < H - GRID; y += GRID) {
            const v00 = field(x,        y,        t);
            const v10 = field(x + GRID, y,        t);
            const v01 = field(x,        y + GRID, t);
            const v11 = field(x + GRID, y + GRID, t);
            const interp = (a: number, b: number, va: number, vb: number) =>
              Math.abs(vb - va) < 0.0001 ? a : a + (iso - va) / (vb - va) * (b - a);
            const pts: [number, number][] = [];
            if ((v00 < iso) !== (v10 < iso)) pts.push([interp(x, x + GRID, v00, v10), y]);
            if ((v10 < iso) !== (v11 < iso)) pts.push([x + GRID, interp(y, y + GRID, v10, v11)]);
            if ((v01 < iso) !== (v11 < iso)) pts.push([interp(x, x + GRID, v01, v11), y + GRID]);
            if ((v00 < iso) !== (v01 < iso)) pts.push([x, interp(y, y + GRID, v00, v01)]);
            if (pts.length >= 2) {
              ctx.moveTo(pts[0][0], pts[0][1]);
              ctx.lineTo(pts[1][0], pts[1][1]);
            }
          }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    function animate() {
      t += 0.012;
      drawContours();
      raf = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

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
        <div className="eyebrow">COURSES</div>

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
