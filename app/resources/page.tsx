import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import VideoGallery, { type VideoItem } from '@/components/VideoGallery';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
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

const INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Institutional workshop',
  'Consulting project',
];

export default async function ResourcesPage() {
  const supabase = getSupabaseAdmin();
  const [{ data: booksData }, { data: videosData }] = await Promise.all([
    supabase.from('books').select('title, author, description, tag, url, cover_url').eq('active', true).order('display_order'),
    supabase.from('videos').select('youtube_id, title, channel').eq('active', true).order('display_order'),
  ]);
  const books = booksData ?? [];
  const videos: VideoItem[] = (videosData ?? []).map(v => ({ id: v.youtube_id, title: v.title, meta: v.channel }));
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

            <VideoGallery videos={videos} />
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
              {books.map((b, i) => (
                <a key={i} href={b.url} target="_blank" rel="noopener" className={styles.bookCard}>
                  <div className={styles.bookCover}>
                    {b.cover_url
                      ? <img src={b.cover_url} alt={b.title} />
                      : <div className={styles.bookCoverPh}><span>📖</span></div>
                    }
                  </div>
                  <div className={styles.bookNum}>0{i + 1}</div>
                  <div className={styles.bookBody}>
                    <p className={styles.bookTitle}>{b.title}</p>
                    <p className={styles.bookAuthor}>{b.author}</p>
                    <p className={styles.bookDesc}>{b.description}</p>
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
