import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { INSIGHT_POSTS, getInsightPost } from '@/lib/insights';
import styles from '../insights.module.css';

export function generateStaticParams() {
  return INSIGHT_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getInsightPost(slug);
  if (!post) return {};

  const url = `https://www.yaftdesigns.com/insights/${post.slug}`;
  return {
    title: `${post.title} | YAFT Designs`,
    description: post.dek,
    alternates: { canonical: `/insights/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.dek,
      url,
      type: 'article',
      images: [{ url: 'https://www.yaftdesigns.com/assets/images/og-image.jpg' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.dek,
      images: ['https://www.yaftdesigns.com/assets/images/og-image.jpg'],
    },
  };
}

export default async function InsightPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getInsightPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.dek,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: 'Yokes Marapa' },
    publisher: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
  };

  return (
    <>
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main>
        <div className="wrap">
          <article className={styles.article}>
            <Link href="/insights" className={styles.backLink}>← All insights</Link>

            <div className={styles.articleMeta}>
              <span>{new Date(post.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span>·</span>
              <span>{post.readMinutes} min read</span>
            </div>

            <h1>{post.title}</h1>
            <p className={styles.dek2}>{post.dek}</p>

            <div className={styles.body}>
              {post.body.map((block, i) => {
                if (block.type === 'p') return <p key={i}>{block.text}</p>;
                if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>;
                if (block.type === 'code') return <pre key={i}><code>{block.text}</code></pre>;
                if (block.type === 'quote') return <blockquote key={i}>{block.text}</blockquote>;
                return null;
              })}
            </div>

            <div className={styles.articleTags}>
              {post.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </article>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
