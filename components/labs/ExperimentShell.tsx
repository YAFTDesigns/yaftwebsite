import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import type { Experiment } from '@/lib/labs/experiments';
import styles from './experiment.module.css';

// Common frame for every interactive experiment: site header/footer, a compact
// hero, the experiment itself (children) and the educational block.
export default function ExperimentShell({
  experiment,
  children,
  about,
}: {
  experiment: Experiment;
  children: ReactNode;
  about: ReactNode;
}) {
  return (
    <>
      <SiteHeader active="/labs" />
      <main>
        <section className={`page-hero ${styles.hero}`}>
          <div className="wrap">
            <p className="eyebrow">YAFT Labs &middot; Interactive experiment</p>
            <h1>{experiment.title}</h1>
          </div>
        </section>
        <div className="wrap">{children}</div>
        <section className={`wrap ${styles.about}`}>
          <h2>{experiment.title}</h2>
          {about}
          <dl className={styles.facts}>
            <div><dt>Method</dt><dd>{experiment.method}</dd></div>
            <div><dt>System</dt><dd>{experiment.system}</dd></div>
            <div><dt>Interaction</dt><dd>{experiment.interaction}</dd></div>
          </dl>
          <Link href="/labs" className={styles.back}>&larr; Back to YAFT Labs</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
