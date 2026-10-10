import Link from 'next/link';
import styles from './TortoiseBadge.module.css';

export default function TortoiseBadge() {
  return (
    <Link href="/tortoise" className={styles.badge} aria-label="Tortoise for Rhino: fabrication sheets plugin. Free trial and licence.">
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 120 120" className={`${styles.ring} ${styles.slow}`}>
          <circle cx="60" cy="60" r="57" fill="none" stroke="#E63946" strokeWidth="2.5" strokeDasharray="6 5" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/images/tortoise/tortoise-logo.png" alt="" width={384} height={384} className={`${styles.logo} ${styles.fast}`} />
      </span>
      <span className={styles.label}>Tortoise<small>Rhino plugin, free trial</small></span>
    </Link>
  );
}
