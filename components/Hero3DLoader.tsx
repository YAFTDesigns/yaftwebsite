'use client';

import dynamic from 'next/dynamic';

// Hero3D pulls in Three.js plus OrbitControls/OBJLoader/RoomEnvironment --
// not small libraries, and previously this was a static import, meaning
// that whole bundle shipped as part of the page's critical JS even
// though the 3D scene itself only initializes after mount (inside a
// useEffect). This defers the bundle into its own chunk, fetched after
// the main page is already interactive, directly addressing the
// "Reduce JavaScript execution time" finding from the real PageSpeed
// report. ssr:false is required here (not in the server-component
// page.tsx directly) since Three.js/WebGL only make sense client-side.
//
// This does NOT touch the 3D model file, materials, or loader logic --
// those broke visually once already and were reverted; this only
// changes when the same, unmodified component's JS loads, a
// self-contained, much lower-risk kind of change.
const Hero3D = dynamic(() => import('./Hero3D'), {
  ssr: false,
  loading: () => <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'var(--paper)' }} />,
});

export default function Hero3DLoader() {
  return <Hero3D />;
}
