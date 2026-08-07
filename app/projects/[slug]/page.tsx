import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import EnquireLink from '@/components/EnquireLink';
import { getSupabasePublic } from '@/lib/supabase/public';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import styles from '../projects.module.css';

// Most project images live in Supabase Storage, but some (client-confidential
// material) are checked into the repo instead under /public. A path starting
// with "/" is treated as a static asset and served as-is.
function resolveImageUrl(path: string): string {
  return path.startsWith('/') ? path : getSiteImageUrl(`projects/${path}`);
}

const CATEGORY_LABELS: Record<string, string> = {
  facade: 'Facade Engineering',
  'bim-automation': 'BIM Automation',
  'computational-design': 'Computational Design',
  wearables: 'Wearables',
  product: 'Product Design',
};

type ProjectRow = {
  slug: string;
  title: string;
  category: string;
  location: string;
  client_or_collab: string | null;
  year: number | null;
  summary: string;
  description: string;
  cover_image_path: string | null;
  gallery: { filename: string; caption: string }[];
};

async function getProject(slug: string): Promise<ProjectRow | null> {
  const { data, error } = await getSupabasePublic()
    .from('portfolio_projects')
    .select('slug, title, category, location, client_or_collab, year, summary, description, cover_image_path, gallery')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProjectRow;
}

async function getOtherSlugs(): Promise<{ slug: string; title: string }[]> {
  const { data } = await getSupabasePublic()
    .from('portfolio_projects')
    .select('slug, title')
    .eq('active', true)
    .order('display_order');
  return data ?? [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};

  const url = `https://www.yaftdesigns.com/projects/${project.slug}`;
  const ogImage = project.cover_image_path
    ? resolveImageUrl(project.cover_image_path)
    : 'https://www.yaftdesigns.com/assets/images/og-image.jpg';

  return {
    title: `${project.title} | YAFT Designs Case Study`,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.title,
      description: project.summary,
      url,
      type: 'article',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.summary,
      images: [ogImage],
    },
  };
}

export default async function ProjectCaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, others] = await Promise.all([getProject(slug), getOtherSlugs()]);
  if (!project) notFound();

  const coverSrc = project.cover_image_path ? resolveImageUrl(project.cover_image_path) : undefined;
  const gallery = (project.gallery ?? []).map((g) => ({ caption: g.caption, src: resolveImageUrl(g.filename) }));
  const paragraphs = project.description.split(/\n{2,}/).filter(Boolean);
  const moreProjects = others.filter((o) => o.slug !== project.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    about: CATEGORY_LABELS[project.category] ?? project.category,
    locationCreated: project.location,
    creator: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
  };

  return (
    <>
      <SiteHeader active="/projects" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main id="top">
        <section className={styles.caseHero}>
          {coverSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt={project.title} className={styles.caseHeroImg} />
          )}
          <div className={styles.caseHeroFade} />
          <div className="wrap">
            <Link href="/projects" className={styles.caseBack}>← All projects</Link>
            <span className={styles.cardCategory}>{CATEGORY_LABELS[project.category] ?? project.category}</span>
            <h1 className={styles.caseTitle}>{project.title}</h1>
            <p className={styles.caseMeta}>
              {project.location}
              {project.year ? ` · ${project.year}` : ''}
              {project.client_or_collab ? ` · with ${project.client_or_collab}` : ''}
            </p>
          </div>
        </section>

        <section>
          <div className="wrap" style={{ maxWidth: 760 }}>
            {paragraphs.map((para, i) => (
              <p key={i} className={styles.caseParagraph}>{para}</p>
            ))}

            <div style={{ marginTop: 32 }}>
              <EnquireLink course="Consulting project" />
            </div>
          </div>
        </section>

        {gallery.length > 0 && (
          <section>
            <div className="wrap">
              <div className="eyebrow">GALLERY</div>
              <div className={styles.caseGallery}>
                {gallery.map((g, i) => (
                  <figure key={i} className={styles.caseGalleryItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.src} alt={g.caption || project.title} loading="lazy" decoding="async" />
                    {g.caption && <figcaption>{g.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {moreProjects.length > 0 && (
          <section className="dark">
            <div className="wrap">
              <div className="eyebrow">MORE WORK</div>
              <div className={styles.caseMoreLinks}>
                {moreProjects.map((p) => (
                  <Link key={p.slug} href={`/projects/${p.slug}`} className={styles.caseMoreLink}>
                    {p.title} →
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
