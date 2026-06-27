import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const TITLE = 'Projects | Computational Design Portfolio';
const DESCRIPTION =
  'Computational design, facade engineering, BIM automation and digital fabrication projects by YAFT Designs. Case studies and live project work.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/projects' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/projects',
    type: 'website',
    images: [{ url: 'https://yaftdesigns.com/assets/images/profile.jpeg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://yaftdesigns.com/assets/images/profile.jpeg'],
  },
};

const PROJECTS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Projects | YAFT Designs',
  description: DESCRIPTION,
  url: 'https://yaftdesigns.com/projects',
  creator: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://yaftdesigns.com' },
  isPartOf: { '@type': 'WebSite', name: 'YAFT Designs', url: 'https://yaftdesigns.com' },
};

export default function ProjectsPage() {
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

        <section className="insta-section">
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', width: '100%' }}>
            <div className="insta-left">
              <div className="eyebrow">While you wait</div>
              <h2>Process shots live on Instagram</h2>
              <p>
                Scripts running, panels rationalizing, workshops in progress. Follow <strong>@yaft_designs</strong>{' '}
                for the unedited version.
              </p>
            </div>
            <a href="https://www.instagram.com/yaft_designs/?hl=en" target="_blank" rel="noopener noreferrer" className="insta-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
              </svg>
              @yaft_designs
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
