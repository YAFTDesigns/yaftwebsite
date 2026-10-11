'use client';

import dynamic from 'next/dynamic';

// Three.js + loaders live in their own chunk, fetched after the page is
// interactive. ssr:false has to sit in a client module, hence this file.
export default dynamic(() => import('./Hero3D'), {
  ssr: false,
  loading: () => <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'var(--paper)' }} />,
});
