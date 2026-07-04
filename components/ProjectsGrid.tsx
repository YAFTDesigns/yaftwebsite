'use client';

import { useState } from 'react';
import { OPEN_LIGHTBOX_EVENT, type LightboxOpenDetail } from './Lightbox';
import styles from '@/app/projects/projects.module.css';

export type PortfolioProject = {
  slug: string;
  title: string;
  category: string;
  location: string;
  clientOrCollab: string | null;
  year: number | null;
  summary: string;
  coverSrc?: string;
  featured: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  facade: 'Facade Engineering',
  'bim-automation': 'BIM Automation',
  'computational-design': 'Computational Design',
  wearables: 'Wearables',
  product: 'Product Design',
};

export default function ProjectsGrid({ projects }: { projects: PortfolioProject[] }) {
  const [filter, setFilter] = useState<string>('all');
  const categories = ['all', ...Array.from(new Set(projects.map(p => p.category)))];
  const visible = filter === 'all' ? projects : projects.filter(p => p.category === filter);

  return (
    <div>
      <div className={styles.tabs}>
        {categories.map(c => (
          <button
            key={c}
            type="button"
            className={`${styles.tab}${filter === c ? ` ${styles.activeTab}` : ''}`}
            onClick={() => setFilter(c)}
          >
            {c === 'all' ? 'All' : CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>No projects in this category yet.</p>
      ) : (
        <div className={styles.grid}>
          {visible.map(p => (
            <button
              key={p.slug}
              type="button"
              className={styles.card}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent<LightboxOpenDetail>(OPEN_LIGHTBOX_EVENT, { detail: { groupKey: p.slug, index: 0 } })
                )
              }
            >
              <div className={styles.thumb}>
                {p.coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverSrc} alt={p.title} />
                ) : (
                  <span className={styles.phLabel}>Coming soon</span>
                )}
                {p.featured && <span className={styles.featuredTag}>Featured</span>}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>{CATEGORY_LABELS[p.category] ?? p.category}</span>
                <h3>{p.title}</h3>
                <p className={styles.cardMeta}>{p.location}{p.year ? ` · ${p.year}` : ''}</p>
                <p className={styles.cardSummary}>{p.summary}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
