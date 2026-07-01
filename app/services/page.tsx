import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import WorkshopGallery from '@/components/WorkshopGallery';
import Lightbox, { type WorkshopGroup } from '@/components/Lightbox';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import styles from './services.module.css';

const TITLE = 'BIM Consulting & Computational Design Services | India, Australia, Singapore, UAE';
const DESCRIPTION =
  'Computational design, BIM consulting, parametric facades and digital fabrication services. Active on projects across India, Australia, Singapore, Hong Kong, UAE, Saudi Arabia, Qatar and Oman.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/services' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/services',
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

const SERVICE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Computational Design and BIM Consulting',
  provider: {
    '@type': 'Organization',
    name: 'YAFT Designs',
    url: 'https://yaftdesigns.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Coimbatore',
      addressRegion: 'Tamil Nadu',
      addressCountry: 'IN',
    },
  },
  serviceType: ['Parametric Facade Design', 'BIM Consulting', 'Shop Drawing Automation', 'Corporate Training', 'Institutional Workshops'],
  areaServed: [
    { '@type': 'City',    name: 'Coimbatore' },
    { '@type': 'City',    name: 'Chennai' },
    { '@type': 'City',    name: 'Bangalore' },
    { '@type': 'City',    name: 'Mumbai' },
    { '@type': 'City',    name: 'Sydney' },
    { '@type': 'City',    name: 'Melbourne' },
    { '@type': 'City',    name: 'Singapore' },
    { '@type': 'City',    name: 'Jakarta' },
    { '@type': 'City',    name: 'Manila' },
    { '@type': 'City',    name: 'Tokyo' },
    { '@type': 'City',    name: 'Hong Kong' },
    { '@type': 'City',    name: 'Muscat' },
    { '@type': 'Country', name: 'India' },
    { '@type': 'Country', name: 'Australia' },
    { '@type': 'Country', name: 'Singapore' },
    { '@type': 'Country', name: 'Indonesia' },
    { '@type': 'Country', name: 'Philippines' },
    { '@type': 'Country', name: 'Japan' },
    { '@type': 'Country', name: 'Hong Kong' },
    { '@type': 'Country', name: 'Oman' },
    { '@type': 'Country', name: 'United Arab Emirates' },
    { '@type': 'Country', name: 'Saudi Arabia' },
    { '@type': 'Country', name: 'Qatar' },
    { '@type': 'City',    name: 'Dubai' },
    { '@type': 'City',    name: 'Abu Dhabi' },
    { '@type': 'City',    name: 'Riyadh' },
    { '@type': 'City',    name: 'Doha' },
  ],
  url: 'https://yaftdesigns.com/services',
  description:
    'Computational design execution from parametric facade rationalization to fabrication-ready output, shop drawing automation, and structured training.',
};

const INTEREST_OPTIONS = [
  'Parametric facade fabrication',
  'Shop drawing automation',
  'College workshop',
  'Corporate training',
  'Consulting project',
];

const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

export default async function ServicesPage() {
  const { data } = await fetch(`${base}/api/workshops`, { cache: 'no-store' }).then(r => r.json());
  const workshops: (WorkshopGroup & { place: string; num: string; description: string })[] = ((data ?? []) as { key: string; num: string; place: string; title: string; role: string; description: string; photos: { filename: string; caption: string }[] }[]).map(w => ({
    key: w.key,
    num: w.num,
    place: w.place,
    title: w.title,
    role: w.role,
    description: w.description,
    photos: (w.photos as { filename: string; caption: string }[]).map(p => ({
      caption: p.caption,
      src: getSiteImageUrl(`workshops/${p.filename}`),
    })),
  }));
  return (
    <>
      <SiteHeader active="/services" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_JSON_LD) }}
      />

      <main id="top">
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">SERVICES</div>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, letterSpacing: '-0.02em' }}>Computational design execution: from parametric facade to fabrication-ready output.</h1>
            <p className="lede">YAFT Designs works alongside studios, contractors, and institutions, covering live facade scripting, shop drawing automation, and structured training, drawn from work running across five countries.</p>
          </div>
        </section>

        <section id="services">
          <div className="wrap">
            <div className="eyebrow">WHAT WE DO</div>
            <div className="section-head">
              <h2>Beyond the classroom</h2>
              <p className="note">Consulting and delivery work for studios and contractors who need outsourced computational design expertise.</p>
            </div>
            <div className={styles.servicesList}>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>01</span>
                <h3>Parametric facade fabrication</h3>
                <p>Surface rationalization, panel typology, and double-curved geometry workflows scripted end-to-end in Grasshopper, built for fabrication, not just visualization.</p>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>02</span>
                <h3>Shop drawing automation</h3>
                <p>Scripted documentation pipelines that take rationalized geometry straight to fabrication-ready shop drawings, cutting manual drafting time on large panel counts.</p>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>03</span>
                <h3>College workshops</h3>
                <p>Multi-day or semester-length computational design programs for architecture schools, delivered on campus or online.</p>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>04</span>
                <h3>Corporate training for architectural firms</h3>
                <p>Structured digital-tech upskilling for practicing studios: Rhino, Grasshopper, and Rhino.Inside.Revit workflows tailored to the firm&apos;s live project pipeline.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="workshops" className="dark">
          <div className="wrap">
            <div className="eyebrow">WORKSHOP ARCHIVE</div>
            <div className="section-head">
              <h2>Workshops delivered.</h2>
              <p className="note">Institutional and academic engagements, ongoing and completed.</p>
            </div>

            <div className={styles.workshopList}>
              {workshops.map((w) => (
                <div className={styles.workshopRow} key={w.key}>
                  <div className={styles.workshopMeta}>
                    <span className={styles.workshopNum}>{w.num}</span>
                    <span className={styles.workshopPlace}>{w.place}</span>
                  </div>
                  <h3>{w.title}</h3>
                  <div className={styles.workshopRole}>{w.role}</div>
                  <p className={styles.desc}>{w.description}</p>
                  <WorkshopGallery group={w} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact">
          <div className="wrap">
            <div className="eyebrow">CONTACT</div>
            <div className="section-head"><h2>Start a services enquiry</h2></div>

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
      <Lightbox groups={workshops} />
    </>
  );
}
