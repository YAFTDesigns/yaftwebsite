'use client';

import Link from 'next/link';
import { EXPERIMENTS, experimentHref } from '@/lib/labs/experiments';
import { track } from '@/lib/analytics';
import styles from './experiment.module.css';

// Entry point on the Labs page; sits above the script library without touching it.
export default function ExperimentsStrip() {
  if (EXPERIMENTS.length === 0) return null;
  return (
    <section className={styles.strip} aria-label="Interactive experiments">
      <div className={styles.stripInner}>
        <p className={styles.stripLabel}>Interactive experiments</p>
        <div className={styles.stripGrid}>
          {EXPERIMENTS.map((e) => (
            <Link
              key={e.slug}
              href={experimentHref(e.slug)}
              className={styles.stripCard}
              onClick={() => track('cta_click', { page: '/labs', meta: { cta: 'lab_experiment_open', experiment: e.slug } })}
            >
              <span className={styles.stripTitle}>{e.title}</span>
              <span className={styles.stripSummary}>{e.summary}</span>
              <span className={styles.stripTags}>{e.tags.join(' · ')}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
