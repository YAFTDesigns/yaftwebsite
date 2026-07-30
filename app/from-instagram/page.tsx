import type { Metadata } from 'next';
import Link from 'next/link';
import { INSIGHT_POSTS } from '@/lib/insights';
import styles from './from-instagram.module.css';

export const metadata: Metadata = {
  title: 'YAFT Designs | From Instagram',
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: '/courses', label: 'Browse courses', desc: 'Rhino, Grasshopper, Rhino.Inside.Revit training' },
  { href: '/projects', label: 'See project work', desc: 'Facade engineering, BIM automation, real case studies' },
  { href: '/services#contact', label: 'Book a call', desc: 'Talk through a project or a training need' },
];

export default function FromInstagramPage() {
  const latestPost = [...INSIGHT_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>YAFT</span>
          <span className={styles.sub}>Designs</span>
        </div>
        <p className={styles.tag}>Authorized Rhino Training Center, Coimbatore</p>

        {latestPost && (
          <Link href={`/insights/${latestPost.slug}`} className={styles.featured}>
            <span className={styles.featuredLabel}>Latest from the desk</span>
            <span className={styles.featuredTitle}>{latestPost.title}</span>
            <span className={styles.featuredArrow}>Read the workflow &rarr;</span>
          </Link>
        )}

        <div className={styles.links}>
          {LINKS.map((l) => (
            <Link href={l.href} key={l.href} className={styles.linkItem}>
              <span className={styles.linkLabel}>{l.label}</span>
              <span className={styles.linkDesc}>{l.desc}</span>
            </Link>
          ))}
        </div>

        <Link href="/" className={styles.homeLink}>Or just explore the full site &rarr;</Link>
      </div>
    </main>
  );
}
