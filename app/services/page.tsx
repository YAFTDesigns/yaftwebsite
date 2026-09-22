import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import NextSteps from '@/components/NextSteps';
import WorkshopGallery from '@/components/WorkshopGallery';
import StickyServiceScroller from '@/components/StickyServiceScroller';
import Lightbox, { type WorkshopGroup } from '@/components/Lightbox';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import { resolveServiceImageUrl } from '@/lib/serviceImages';
import styles from './services.module.css';

const TITLE = 'BIM Consulting & Computational Design Services | India, Australia, Singapore, UAE';
const DESCRIPTION =
  'Computational design, BIM consulting, parametric facades and digital fabrication services. Active on projects across India, Australia, Singapore, Hong Kong, UAE, Saudi Arabia, Qatar and Oman.';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/services' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.yaftdesigns.com/services',
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

const SERVICE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Computational Design and BIM Consulting',
  provider: {
    '@type': 'Organization',
    name: 'YAFT Designs',
    url: 'https://www.yaftdesigns.com',
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
  url: 'https://www.yaftdesigns.com/services',
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

// Tags pulled directly from language already in each service's own
// description below, not invented -- e.g. "Grasshopper", "fabrication",
// "panel typology" all appear verbatim in the existing copy.
const SERVICES = [
  {
    key: 'parametric-facade',
    num: '01',
    title: 'Parametric facade fabrication',
    description: 'Surface rationalization, panel typology, and double-curved geometry workflows scripted end-to-end in Grasshopper, built for fabrication, not just visualization.',
    tags: ['Surface rationalization', 'Panel typology', 'Double-curved geometry', 'Grasshopper', 'Fabrication'],
  },
  {
    key: 'shop-drawing',
    num: '02',
    title: 'Shop drawing automation',
    description: 'Scripted documentation pipelines that take rationalized geometry straight to fabrication-ready shop drawings, cutting manual drafting time on large panel counts.',
    tags: ['Scripted documentation', 'Shop drawings', 'Large panel counts', 'Rhino.Inside.Revit'],
  },
  {
    key: 'college-workshops',
    num: '03',
    title: 'College workshops',
    description: 'Multi-day or semester-length computational design programs for architecture schools, delivered on campus or online.',
    tags: ['Multi-day programs', 'Semester-length', 'On campus', 'Online'],
  },
  {
    key: 'corporate-training',
    num: '04',
    title: 'Corporate training for architectural firms',
    description: "Structured digital-tech upskilling for practicing studios: Rhino, Grasshopper, and Rhino.Inside.Revit workflows tailored to the firm's live project pipeline.",
    tags: ['Rhino', 'Grasshopper', 'Rhino.Inside.Revit', 'Live project pipeline'],
  },
] as const;

export default async function ServicesPage() {
  // A transient Supabase failure previously crashed this entire public
  // page with an unhandled 500 -- confirmed via a local resilience test
  // that simulated the DB being unreachable. Wrapped so the page still
  // renders (just without the workshop gallery) instead of going down
  // entirely over one flaky query.
  let data: { key: string; num: string; place: string; title: string; role: string; description: string; photos: unknown }[] = [];
  try {
    const res = await getSupabaseAdmin()
      .from('workshops').select('key, num, place, title, role, description, photos').eq('active', true).order('display_order');
    if (res.error) console.error('[services] workshops query failed:', res.error.message);
    data = res.data ?? [];
  } catch (err) {
    console.error('[services] workshops query threw:', err);
  }
  const workshops: (WorkshopGroup & { place: string; num: string; description: string })[] = data.map(w => ({
    key: w.key,
    num: w.num,
    place: w.place,
    title: w.title,
    role: w.role,
    description: w.description,
    photos: (w.photos as { filename?: string; caption: string }[]).map(p => ({
      caption: p.caption,
      src: p.filename ? getSiteImageUrl(`workshops/${p.filename}`) : undefined,
    })),
  }));

  // Same resilience pattern as the workshops query above -- a failed
  // fetch here just means the 4 service blocks render without images
  // (the noImage/text-forward treatment), not a page-wide crash.
  let serviceImageMap: Record<string, { image_path: string | null; caption: string | null }> = {};
  try {
    const { data: imgData, error: imgErr } = await getSupabaseAdmin().from('service_images').select('service_key, image_path, caption');
    if (imgErr) console.error('[services] service_images query failed:', imgErr.message);
    serviceImageMap = Object.fromEntries((imgData ?? []).map((r) => [r.service_key, r]));
  } catch (err) {
    console.error('[services] service_images query threw:', err);
  }

  return (
    <>
      <SiteHeader active="/services" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_JSON_LD) }}
      />

      <main id="top">
        <section className={`page-hero ${styles.servicesHero}`}>
          <div className={styles.heroSlide + ' ' + styles.heroSlide1} />
          <div className={styles.heroSlide + ' ' + styles.heroSlide2} />
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
              <StickyServiceScroller
                services={SERVICES.map((svc) => {
                  const img = serviceImageMap[svc.key];
                  return {
                    key: svc.key,
                    num: svc.num,
                    title: svc.title,
                    description: svc.description,
                    tags: svc.tags,
                    imageUrl: resolveServiceImageUrl(img?.image_path ?? null),
                    caption: img?.caption ?? null,
                  };
                })}
              />
            </div>
          </div>
        </section>

        <section id="workshops" className="dark">
          <div className="wrap">
            <div className="eyebrow">WORKSHOP ARCHIVE</div>
            <div className="section-head">
              <h2>Where this has actually been delivered.</h2>
              <p className="note">Real institutional and academic engagements, photographed on-site, not a client list.</p>
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

        <NextSteps
          links={[
            { href: '/projects', label: 'See project case studies', description: 'Facade engineering, BIM automation, and computational design work across five countries.' },
            { href: '/insights', label: 'Read our insights', description: 'Real workflows and scripts behind the work, like clustering 131 facade fins to cut mold counts.' },
            { href: '/courses', label: 'Browse courses', description: 'Learn the same Rhino and Grasshopper workflows we use on real projects.' },
          ]}
        />

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
