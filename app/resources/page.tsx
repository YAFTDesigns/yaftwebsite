import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import VideoGallery, { type VideoItem } from '@/components/VideoGallery';
import styles from './resources.module.css';

const TITLE = 'Rhino3D & Grasshopper Learning Resources';
const DESCRIPTION = 'Free Rhino3D, Grasshopper and computational design resources, tutorials, guides and learning materials.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/resources' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/resources',
    type: 'website',
    images: [{ url: 'https://yaftdesigns.com/assets/images/og-image.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://yaftdesigns.com/assets/images/og-image.jpg'],
  },
};

const RESOURCES_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Rhino3D and Grasshopper Resources',
  url: 'https://yaftdesigns.com/resources',
  description: 'Video tutorials, walkthroughs and learning resources for Rhino3D, Grasshopper and computational design by YAFT Designs.',
  publisher: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://yaftdesigns.com' },
};

const BOOKS = [
  {
    title: 'AAD Algorithms-Aided Design',
    author: 'Arturo Tedeschi',
    desc: 'The definitive Grasshopper textbook. Covers parametric strategies, data trees, and fabrication logic. Essential for anyone serious about computational design.',
    tag: 'Grasshopper',
    url: 'https://www.amazon.in/AAD-Algorithms-Aided-Design-Parametric-Grasshopper/dp/8895315308',
    cover: 'https://covers.openlibrary.org/b/isbn/9788895315300-L.jpg',
  },
  {
    title: 'Advanced 3D Printing with Grasshopper',
    author: 'Diego Pinochet',
    desc: 'Clay and FDM workflows using Grasshopper for additive manufacturing. Highly practical — bridges parametric design and physical output.',
    tag: 'Grasshopper · Fabrication',
    url: 'https://www.amazon.in/Advanced-3D-Printing-Grasshopper%C2%AE-Clay/dp/B086Y7CLLC',
    cover: 'https://covers.openlibrary.org/b/isbn/B086Y7CLLC-L.jpg',
  },
  {
    title: 'Essential Algorithms and Data Structures for Grasshopper',
    author: 'Robert McNeel & Associates',
    desc: 'Free primer on data structures, lists, trees, and algorithmic thinking in Grasshopper. Read this before anything else if you are new to parametric logic.',
    tag: 'Grasshopper · Free',
    url: 'https://www.food4rhino.com/en/resource/essential-algorithms-and-data-structures-grasshopper-2nd-edition',
    cover: null,
  },
  {
    title: 'Computational Design Thinking',
    author: 'Achim Menges & Sean Ahlquist',
    desc: 'AD Reader that frames computational design as a design discipline, not just a software skill. Theory-heavy but essential context for architecture students.',
    tag: 'Theory · Architecture',
    url: 'https://www.amazon.in/Computational-Design-Thinking-Computation-Reader/dp/0470665653',
    cover: 'https://covers.openlibrary.org/b/isbn/9780470665657-L.jpg',
  },
];

const INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Institutional workshop',
  'Consulting project',
];

const VIDEOS: VideoItem[] = [
  { id: 'BC7ScSC-pP0', title: 'RHINO 8 Clipping Sections: Dynamic Sections, New Features', meta: 'YAFT Designs' },
  { id: 'EY6WA3geQcc', title: 'Ladybug Steps for Installation: Rhino & Grasshopper', meta: 'YAFT Designs' },
  { id: 'nspaJbQ1BIg', title: 'YAFT Designs Short', meta: 'Shorts' },
  { id: 'rvuW5sQZoLM', title: 'YAFT Designs Short', meta: 'Shorts' },
];

export default function ResourcesPage() {
  return (
    <>
      <SiteHeader active="/resources" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(RESOURCES_JSON_LD) }}
      />

      <main id="top">
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">RESOURCES</div>
            <h1>Watch, read, and keep learning.</h1>
            <p className="lede">Tutorials and walkthroughs from the YAFT Designs YouTube channel, plus a running reading list.</p>
          </div>
        </section>

        <section id="videos">
          <div className="wrap">
            <div className="eyebrow">VIDEOS</div>
            <div className="section-head">
              <h2>Recent uploads</h2>
              <p className="note">
                <a href="https://www.youtube.com/@yaftdesigns" target="_blank" rel="noopener" style={{ color: 'var(--brass)' }}>
                  View full channel →
                </a>
              </p>
            </div>

            <VideoGallery videos={VIDEOS} />
          </div>
        </section>

        <section id="books" className="dark">
          <div className="wrap">
            <div className="eyebrow">BOOKS</div>
            <div className="section-head">
              <h2>Reading list</h2>
              <p className="note">Books worth your time, on computational design and beyond.</p>
            </div>
            <div className={styles.bookGrid}>
              {BOOKS.map((b, i) => (
                <a key={i} href={b.url} target="_blank" rel="noopener" className={styles.bookCard}>
                  <div className={styles.bookCover}>
                    {b.cover
                      ? <img src={b.cover} alt={b.title} />
                      : <div className={styles.bookCoverPh}><span>📖</span></div>
                    }
                  </div>
                  <div className={styles.bookNum}>0{i + 1}</div>
                  <div className={styles.bookBody}>
                    <p className={styles.bookTitle}>{b.title}</p>
                    <p className={styles.bookAuthor}>{b.author}</p>
                    <p className={styles.bookDesc}>{b.desc}</p>
                    <span className={styles.bookTag}>{b.tag}</span>
                  </div>
                  <span className={styles.bookArrow}>↗</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="contact">
          <div className="wrap">
            <div className="eyebrow">CONTACT</div>
            <div className="section-head"><h2>Get in touch</h2></div>

            <div className="contact-grid">
              <ContactForm options={INTEREST_OPTIONS} />

              <dl className="contact-info">
                <dt>Studio</dt>
                <dd>Coimbatore, Tamil Nadu, India</dd>
                <dt>Email</dt>
                <dd><a href="mailto:yaftdesigns@gmail.com">yaftdesigns@gmail.com</a></dd>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
