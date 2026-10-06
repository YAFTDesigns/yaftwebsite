'use client';

import dynamic from 'next/dynamic';
import styles from './experiment.module.css';

// Three.js is heavy and WebGL is client-only, so the viewport loads as its own
// chunk after the page is interactive (same approach as Hero3DLoader).
const Viewport = dynamic(() => import('./TensileMembraneViewport'), {
  ssr: false,
  loading: () => (
    <div className={styles.stage}>
      <div className={styles.viewport}><div className={styles.loading}>Loading experiment…</div></div>
    </div>
  ),
});

export default function TensileMembraneLoader() {
  return <Viewport />;
}
