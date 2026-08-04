import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ProjectsGrid, { type PortfolioProject } from '@/components/ProjectsGrid';
import Lightbox, { type WorkshopGroup } from '@/components/Lightbox';
import CarouselDrag from '@/components/CarouselDrag';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import { getInstagramMedia } from '@/lib/instagram';

// Most project images live in Supabase Storage, but some (e.g. where
// we can't put client-confidential material through a third-party
// service) are checked into the repo instead under /public. A path
// starting with "/" is treated as a static asset path and served
// as-is; anything else is resolved through Supabase Storage as before.
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

const TITLE = 'Computational Design Projects | YAFT Designs Coimbatore';
const DESCRIPTION =
  'Facade engineering, BIM automation, and computational design projects by YAFT Designs. Live project work across India, Singapore, Hong Kong, Australia and Oman.';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/projects' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.yaftdesigns.com/projects',
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

const PROJECTS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Projects | YAFT Designs',
  description: DESCRIPTION,
  url: 'https://www.yaftdesigns.com/projects',
  creator: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
  isPartOf: { '@type': 'WebSite', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
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
  featured: boolean;
};

export default async function ProjectsPage() {
  const [{ data }, instagramMedia] = await Promise.all([
    getSupabaseAdmin()
      .from('portfolio_projects')
      .select('slug, title, category, location, client_or_collab, year, summary, description, cover_image_path, gallery, featured')
      .eq('active', true)
      .order('display_order'),
    getInstagramMedia(8),
  ]);

  const rows = (data as ProjectRow[] | null) ?? [];

  const gridProjects: PortfolioProject[] = rows.map(p => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    location: p.location,
    clientOrCollab: p.client_or_collab,
    year: p.year,
    summary: p.summary,
    coverSrc: p.cover_image_path ? resolveImageUrl(p.cover_image_path) : undefined,
    featured: p.featured,
  }));

  const lightboxGroups: WorkshopGroup[] = rows.map(p => {
    const galleryPhotos = (p.gallery ?? []).map(g => ({
      caption: g.caption,
      src: resolveImageUrl(g.filename),
    }));
    const photos = galleryPhotos.length > 0
      ? galleryPhotos
      : [{ caption: p.description, src: p.cover_image_path ? resolveImageUrl(p.cover_image_path) : undefined }];
    return {
      key: p.slug,
      title: p.title,
      role: `${CATEGORY_LABELS[p.category] ?? p.category} · ${p.location}${p.client_or_collab ? ` · ${p.client_or_collab}` : ''}`,
      photos,
    };
  });

  return (
    <>
      <SiteHeader active="/projects" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PROJECTS_JSON_LD) }}
      />

      <main id="top">
        <section className="page-hero">
          <div className="wrap">
            <h1>
              Every drawing has a
              <br />
              <em>story behind it.</em>
            </h1>
            <p className="lede">
              From Vande Bharat cockpit development to computational design, facade engineering, BIM automation and
              digital fabrication, our project portfolio is currently being curated into detailed case studies.
            </p>
          </div>
        </section>

        <section id="portfolio">
          <div className="wrap">
            <div className="eyebrow">CASE STUDIES</div>
            <div className="section-head">
              <h2>Selected work</h2>
              <p className="note">Facade engineering, BIM automation, computational design and product work across five countries.</p>
            </div>
            <ProjectsGrid projects={gridProjects} />
          </div>
        </section>

        <section className="insta-section">
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', width: '100%' }}>
            <div className="insta-left">
              <div className="eyebrow">While you wait</div>
              <h2>Process shots live on Instagram</h2>
              <p>
                Scripts running, panels rationalizing, workshops in progress. Follow <strong>@yaft_designs</strong>{' '}
                for the unedited version.
              </p>
              <a href="https://www.instagram.com/yaft_designs/?hl=en" target="_blank" rel="noopener noreferrer" className="insta-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
                @yaft_designs
              </a>
            </div>
            {instagramMedia.length > 0 && (
              <div className="insta-carousel-outer">
                <CarouselDrag id="instaTrack" />
                <div className="insta-carousel-track" id="instaTrack">
                  {instagramMedia.map((item) => (
                    <a
                      key={item.id}
                      href={item.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="insta-thumb-card"
                    >
                      {item.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnailUrl}
                          alt={item.caption ? item.caption.slice(0, 80) : 'Instagram post'}
                          loading="lazy"
                          decoding="async"
                          draggable="false"
                        />
                      )}
                      {item.mediaType === 'VIDEO' && (
                        <span className="insta-play-icon">
                          <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Lightbox groups={lightboxGroups} />

      <SiteFooter />
    </>
  );
}
