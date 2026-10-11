import Link from 'next/link';
import styles from './TortoiseBadge.module.css';

export default function TortoiseBadge() {
  return (
    <Link href="/tortoise" className={styles.badge} aria-label="Tortoise for Rhino: fabrication sheets plugin. Free trial and licence.">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/images/tortoise/tortoise-logo.png" alt="Tortoise" width={384} height={384} className={styles.logo} />
    </Link>
  );
}
