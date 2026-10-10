import Link from 'next/link';
import styles from './TortoiseBadge.module.css';

// Placeholder mark: shell rings spinning at different speeds. Swap the
// SVG for the real Tortoise logo when it is ready; the link and
// animation wrapper can stay.
function hex(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export default function TortoiseBadge() {
  return (
    <Link href="/tortoise" className={styles.badge} aria-label="Tortoise for Rhino: fabrication sheets plugin. Free trial and licence.">
      <svg viewBox="0 0 120 120" className={styles.svg} aria-hidden="true">
        <g className={styles.slow}>
          <circle cx="60" cy="60" r="56" fill="none" stroke="#E63946" strokeWidth="2.5" strokeDasharray="6 5" />
        </g>
        <g className={styles.mid}>
          <polygon points={hex(42)} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 3) * i - Math.PI / 2;
            return <line key={i} x1="60" y1="60" x2={60 + 42 * Math.cos(a)} y2={60 + 42 * Math.sin(a)} stroke="#fff" strokeWidth="1.2" opacity="0.55" />;
          })}
        </g>
        <g className={styles.fast}>
          <polygon points={hex(20)} fill="#E63946" />
        </g>
      </svg>
      <span className={styles.label}>Tortoise<small>Rhino plugin, free trial</small></span>
    </Link>
  );
}
