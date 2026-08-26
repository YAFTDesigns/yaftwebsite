'use client';

import { useState, useMemo } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import type { LabScript, LabCategory } from './page';
import styles from './labs.module.css';

const SITE_IMAGE_BASE = 'https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/site-images/';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export default function LabsPageClient({ scripts, categories }: { scripts: LabScript[]; categories: LabCategory[] }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scripts;
    return scripts.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }, [scripts, query]);

  // Grouped by the real, editable category records -- numbering
  // follows each category's own display_order (set and reorderable in
  // admin), not derived from free text. Only categories with at least
  // one matching script show up, so search naturally hides empty ones.
  const grouped = useMemo(() => {
    return categories
      .map(cat => ({ cat, items: filtered.filter(s => s.category_id === cat.id) }))
      .filter(g => g.items.length > 0);
  }, [categories, filtered]);

  const selected = scripts.find(s => s.id === selectedId) ?? null;

  return (
    <>
      <SiteHeader active="/labs" />

      <main id="top">
        <section className={`page-hero ${styles.hero}`}>
          <video
            className={styles.bgVideo}
            autoPlay muted loop playsInline
            poster="/assets/video/labs-hero-poster.jpg"
          >
            <source src="/assets/video/labs-hero.webm" type="video/webm" />
            <source src="/assets/video/labs-hero.mp4" type="video/mp4" />
          </video>
          <div className={styles.bgFade} />

          <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
            <div className="eyebrow">YAFT LABS</div>
            <h1>YAFT Labs</h1>
            <p className="lede">Small Grasshopper and Rhino scripts, straight from our reels and live projects. Free to grab, ready to build on.</p>
            <div className={styles.statRow}>
              <span className={styles.stat}>{scripts.length} script{scripts.length === 1 ? '' : 's'} and growing</span>
              {scripts.length > 0 && scripts.every(s => s.price === 0) && <span className={styles.statMuted}>All free right now</span>}
            </div>
          </div>
        </section>

        <section className={styles.body}>
          {scripts.length === 0 ? (
            <p className={styles.empty}>No scripts yet -- check back soon.</p>
          ) : (
            <div className={styles.layout}>
              <aside className={styles.sidebar}>
                <input
                  type="text"
                  placeholder="Search scripts..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className={styles.search}
                />
                {grouped.length === 0 ? (
                  <p className={styles.sidebarEmpty}>No matches.</p>
                ) : (
                  grouped.map(({ cat, items }, catIdx) => (
                    <div key={cat.id} className={styles.sidebarCategory}>
                      <p className={styles.sidebarCategoryLabel}>{catIdx + 1}. {cat.name}</p>
                      {items.map((s, itemIdx) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedId(s.id)}
                          className={`${styles.sidebarItem} ${selectedId === s.id ? styles.sidebarItemActive : ''}`}
                        >
                          {catIdx + 1}.{itemIdx + 1}. {s.title}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </aside>

              <div className={styles.mainPanel}>
                {selected ? (
                  <div className={styles.detail}>
                    <button onClick={() => setSelectedId(null)} className={styles.detailBack}>← Back to all scripts</button>
                    <div className={styles.detailImageWrap}>
                      {(selected.detail_image_path || selected.thumbnail_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, full-size detail image, not a next/image candidate here
                        <img
                          src={`${SITE_IMAGE_BASE}${selected.detail_image_path ?? selected.thumbnail_path}`}
                          alt={selected.title}
                          className={styles.detailImage}
                        />
                      ) : (
                        <div className={styles.detailImagePlaceholder} />
                      )}
                    </div>
                    <div className={styles.detailBody}>
                      <span className={`${styles.priceBadge} ${selected.price > 0 ? styles.priceBadgePaid : styles.priceBadgeFree}`}>
                        {selected.price > 0 ? `INR ${fmt(selected.price)}` : 'Free'}
                      </span>
                      <h2 className={styles.detailTitle}>{selected.title}</h2>
                      <p className={styles.detailMeta}>{categories.find(c => c.id === selected.category_id)?.name ?? 'Uncategorized'} · {selected.download_count} download{selected.download_count === 1 ? '' : 's'}</p>
                      <p className={styles.detailDesc}>{selected.description}</p>
                      <a href={`/api/labs/${selected.id}/download`} className={styles.downloadBtn}>
                        Download {selected.price > 0 ? `(INR ${fmt(selected.price)})` : ''} →
                      </a>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <p className={styles.empty}>No scripts match that search.</p>
                ) : (
                  <div className={styles.grid}>
                    {filtered.map(s => (
                      <button key={s.id} onClick={() => setSelectedId(s.id)} className={styles.card}>
                        {s.thumbnail_path ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, card-sized background image, not a next/image candidate here
                          <img src={`${SITE_IMAGE_BASE}${s.thumbnail_path}`} alt={s.title} className={styles.thumb} />
                        ) : (
                          <div className={styles.thumbPlaceholder} />
                        )}
                        <span className={`${styles.priceBadge} ${s.price > 0 ? styles.priceBadgePaid : styles.priceBadgeFree}`}>
                          {s.price > 0 ? `INR ${fmt(s.price)}` : 'Free'}
                        </span>
                        <div className={styles.cardHoverFade} />
                        <div className={styles.cardHoverContent}>
                          <p className={styles.cardTitle}>{s.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
