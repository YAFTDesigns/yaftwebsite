import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FadeInOnView from '@/components/FadeInOnView';
import { INSIGHT_POSTS } from '@/lib/insights';
import styles from './insights.module.css';

const TITLE = 'Insights | Computational Design Notes from YAFT Designs';
const DESCRIPTION = 'Technical writeups on Grasshopper, Rhino, and computational design workflows from real facade engineering and BIM automation work.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/insights' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.yaftdesigns.com/insights',
    type: 'website',
    images: [{ url: 'https://www.yaftdesigns.com/assets/images/og-image.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://www.yaftdesigns.com/assets/images/og-image.jpg'],
  },
};

const INSIGHTS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Insights | YAFT Designs',
  description: DESCRIPTION,
  url: 'https://www.yaftdesigns.com/insights',
  publisher: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
};

export default function InsightsPage() {
  const posts = [...INSIGHT_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <>
      <SiteHeader active="/insights" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(INSIGHTS_JSON_LD) }}
      />

      <main>
        <section className="page-hero">
          <div className="wrap">
            <h1>Notes from the desk, not the deck.</h1>
            <p className="lede">
              Real workflows, scripts, and decisions from facade engineering, BIM automation, and computational
              design work, written up in the level of detail we wish more people shared.
            </p>
          </div>
        </section>

        <section>
          <div className="wrap">
            {posts.length === 0 ? (
              <p className={styles.empty}>Nothing published yet, check back soon.</p>
            ) : (
              <div className={styles.list}>
                {posts.map((p, i) => (
                  <FadeInOnView key={p.slug} delayMs={i * 60}>
                    <Link href={`/insights/${p.slug}`} className={`${styles.postCard}${p.coverImage ? ` ${styles.hasImage}` : ''}`}>
                      {p.coverImage && (
                        <div className={styles.postThumbBg}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.coverImage} alt="" loading="lazy" decoding="async" />
                        </div>
                      )}
                      <div className={styles.postCardBody}>
                        <div className={styles.postMeta}>
                          <span>{new Date(p.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span>·</span>
                          <span>{p.readMinutes} min read</span>
                        </div>
                        <h2>{p.title}</h2>
                        <p className={styles.dek}>{p.dek}</p>
                        <div className={styles.tags}>
                          {p.tags.map((t) => (
                            <span key={t} className={styles.tag}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </FadeInOnView>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
