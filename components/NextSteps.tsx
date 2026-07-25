import Link from 'next/link';
import styles from './NextSteps.module.css';

export type NextStepLink = {
  href: string;
  label: string;
  description: string;
};

export default function NextSteps({ links }: { links: NextStepLink[] }) {
  return (
    <section className={styles.section}>
      <div className="wrap">
        <div className="eyebrow">CONTINUE EXPLORING</div>
        <div className={styles.grid}>
          {links.map((l) => (
            <Link href={l.href} key={l.href} className={styles.card}>
              <span className={styles.arrow}>→</span>
              <h3>{l.label}</h3>
              <p>{l.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
