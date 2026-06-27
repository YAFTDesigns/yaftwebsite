'use client';

import { useEffect, useRef } from 'react';

export default function ContourCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Low-res internal buffer — scale up via CSS for perf
    const SCALE = 0.35;
    let W = 0, H = 0, t = 0, raf = 0;

    function resize() {
      W = canvas!.width  = Math.floor(canvas!.offsetWidth  * SCALE);
      H = canvas!.height = Math.floor(canvas!.offsetHeight * SCALE);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Sine-field: fast, no heavy math
    function f(x: number, y: number) {
      const nx = x / W, ny = y / H;
      return (
        Math.sin(nx * 3.8 + t * 0.38) * 0.45 +
        Math.sin(ny * 3.2 - t * 0.26) * 0.35 +
        Math.sin((nx + ny) * 2.9 + t * 0.20) * 0.20
      );
    }

    const LEVELS = 14;
    const G = 4; // grid step in buffer px — larger = faster

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 0.6;

      for (let lv = 0; lv < LEVELS; lv++) {
        const iso = -0.85 + (lv / (LEVELS - 1)) * 1.7;
        ctx.beginPath();
        for (let x = 0; x < W - G; x += G) {
          for (let y = 0; y < H - G; y += G) {
            const v00 = f(x,     y    );
            const v10 = f(x + G, y    );
            const v01 = f(x,     y + G);
            const v11 = f(x + G, y + G);
            const ip = (a: number, b: number, va: number, vb: number) =>
              a + (iso - va) / (vb - va + 0.0001) * (b - a);
            const pts: [number, number][] = [];
            if ((v00 < iso) !== (v10 < iso)) pts.push([ip(x, x+G, v00, v10), y]);
            if ((v10 < iso) !== (v11 < iso)) pts.push([x+G, ip(y, y+G, v10, v11)]);
            if ((v01 < iso) !== (v11 < iso)) pts.push([ip(x, x+G, v01, v11), y+G]);
            if ((v00 < iso) !== (v01 < iso)) pts.push([x, ip(y, y+G, v00, v01)]);
            if (pts.length >= 2) {
              ctx.moveTo(pts[0][0], pts[0][1]);
              ctx.lineTo(pts[1][0], pts[1][1]);
            }
          }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.13)';
        ctx.stroke();
      }
    }

    let last = 0;
    function loop(ts: number) {
      // throttle to ~24fps — smooth enough, half the CPU of 60fps
      if (ts - last > 40) {
        t += 0.012;
        draw();
        last = ts;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        filter: 'blur(2px)',
        pointerEvents: 'none',
        zIndex: 0,
        imageRendering: 'auto',
      }}
    />
  );
}
