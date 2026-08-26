'use client';

import { useState, useMemo } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import type { LabScript } from './page';
import styles from './labs.module.css';

const SITE_IMAGE_BASE = 'https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/site-images/';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export default function LabsPageClient({ scripts }: { scripts: LabScript[] }) {
  const [query, setQuery] = useState('');
  const [tool, setTool] = useState('All');

  // Tool list is derived from whatever's actually in the data, not
  // hardcoded -- new tool categories just show up automatically as
  // scripts using them get added, no code change needed.
  const tools = useMemo(() => ['All', ...Array.from(new Set(scripts.map(s => s.tool)))], [scripts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scripts.filter(s =>
      (tool === 'All' || s.tool === tool) &&
      (!q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    );
  }, [scripts, query, tool]);

  return (
    <>
      <SiteHeader active="/labs" />

      <main id="top">
        <section className={styles.hero}>
          <video
            className={styles.bgVideo}
            autoPlay muted loop playsInline
            poster="/assets/video/labs-hero-poster.jpg"
          >
            <source src="/assets/video/labs-hero.webm" type="video/webm" />
            <source src="/assets/video/labs-hero.mp4" type="video/mp4" />
          </video>
          <div className={styles.bgFade} />

          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>YAFT Designs</p>
            <h1 className={styles.h1}>YAFT Labs</h1>
            <p className={styles.tagline}>Small Grasshopper and Rhino scripts, straight from our reels and live projects. Free to grab, ready to build on.</p>
            <div className={styles.statRow}>
              <span className={styles.stat}>{scripts.length} script{scripts.length === 1 ? '' : 's'} and growing</span>
              {scripts.every(s => s.price === 0) && <span className={styles.statMuted}>All free right now</span>}
            </div>
          </div>
        </section>

        <section className={styles.body}>
          <input
            type="text"
            placeholder="Search scripts..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={styles.search}
          />

          <div className={styles.filters}>
            {tools.map(t => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`${styles.filterChip} ${tool === t ? styles.filterChipActive : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className={styles.empty}>{scripts.length === 0 ? 'No scripts yet -- check back soon.' : 'No scripts match that search.'}</p>
          ) : (
            <div className={styles.grid}>
              {filtered.map(s => (
                <a key={s.id} href={`/api/labs/${s.id}/download`} className={styles.card}>
                  {s.thumbnail_path ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, card-sized background image, not a next/image candidate here
                    <img
                      src={`${SITE_IMAGE_BASE}${s.thumbnail_path}`}
                      alt={s.title}
                      className={styles.thumb}
                    />
                  ) : (
                    <div className={styles.thumbPlaceholder} />
                  )}
                  <div className={styles.cardFade} />
                  <span className={`${styles.priceBadge} ${s.price > 0 ? styles.priceBadgePaid : styles.priceBadgeFree}`}>
                    {s.price > 0 ? `INR ${fmt(s.price)}` : 'Free'}
                  </span>
                  <div className={styles.cardContent}>
                    <p className={styles.cardTitle}>{s.title}</p>
                    <p className={styles.cardDesc}>{s.description}</p>
                    <p className={styles.cardMeta}>{s.tool} · {s.download_count} download{s.download_count === 1 ? '' : 's'}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
