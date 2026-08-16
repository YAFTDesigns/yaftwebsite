import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import EnquireLink from '@/components/EnquireLink';
import FaqAccordion from '@/components/FaqAccordion';
import Hero3D from '@/components/Hero3D';
import CarouselDrag from '@/components/CarouselDrag';
import ServicesCarousel from '@/components/ServicesCarousel';
import CarouselProgress from '@/components/CarouselProgress';
import ContourCanvas from '@/components/ContourCanvas';
import CoursesHeroBlock from '@/components/CoursesHeroBlock';
import CourseVisualLink from '@/components/CourseVisualLink';
import CourseGateButton from '@/components/CourseGateButton';
import CourseGateModal from '@/components/CourseGateModal';
import { COURSE_DETAIL_PAGES } from './courses/courseNav';
import TestimonialRotator from '@/components/TestimonialRotator';
import { getPartners, getFeaturedTestimonials } from '@/lib/feature-wall';
import styles from './home.module.css';

const TITLE = 'YAFT Designs | Authorized Rhino3D Trainer India, Grasshopper Training Asia Pacific and Middle East';
const DESCRIPTION =
  'Authorized Rhino3D Training Center based in India. Rhino3D, Grasshopper, BIM and Computational Design training online for architects and designers across India, Australia, Singapore, UAE, Indonesia, Philippines and Japan.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.yaftdesigns.com/',
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

const AREA_SERVED_CITIES = [
  'Coimbatore', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Pune',
  'Delhi', 'Kolkata', 'Ahmedabad', 'Visakhapatnam', 'Kochi', 'Trichy',
  'Madurai', 'Jaipur', 'Chandigarh',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth',
  'Singapore',
  'Jakarta', 'Surabaya', 'Bali',
  'Manila', 'Cebu',
  'Tokyo', 'Osaka',
  'Hong Kong', 'Kuala Lumpur',
  'Dubai', 'Abu Dhabi', 'Sharjah',
  'Muscat', 'Riyadh', 'Doha', 'Manama', 'Kuwait City',
];

const AREA_SERVED_COUNTRIES = [
  'India', 'Australia', 'Singapore', 'Indonesia',
  'Philippines', 'Japan', 'Hong Kong', 'Malaysia',
  'Oman', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Bahrain', 'Kuwait',
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'YAFT Designs',
  alternateName: [
    'YAFT Designs Computational Design Training',
    'YAFT Designs Rhino Training',
    'Authorized Rhino Training Center India',
  ],
  url: 'https://www.yaftdesigns.com',
  logo: 'https://www.yaftdesigns.com/assets/images/og-image.jpg',
  description:
    'Authorized Rhino Training Center recognized by McNeel and Associates. Offering Rhino3D, Grasshopper, and Rhino.Inside.Revit training across India, Australia, Singapore, Indonesia, Philippines, Japan and online worldwide.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Coimbatore',
    addressRegion: 'Tamil Nadu',
    addressCountry: 'IN',
  },
  areaServed: [
    ...AREA_SERVED_CITIES.map((name) => ({ '@type': 'City', name })),
    ...AREA_SERVED_COUNTRIES.map((name) => ({ '@type': 'Country', name })),
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'yaftdesigns@gmail.com',
    contactType: 'customer support',
    areaServed: ['IN', 'AU', 'SG', 'ID', 'PH', 'JP', 'HK', 'MY', 'OM', 'AE', 'SA', 'QA', 'BH', 'KW'],
    availableLanguage: ['English', 'Tamil'],
  },
  sameAs: [
    'https://www.linkedin.com/in/yokes-marapa-791b06216/',
    'https://www.instagram.com/yaft_designs/',
    'https://www.youtube.com/@yaftdesigns',
    'https://www.rhino3d.com/training/sites/1650/',
    'https://events.food4rhino.com/event/rhino-grasshopper-for-architecture/',
  ],
  founder: {
    '@type': 'Person',
    name: 'Yokes Marapa',
    jobTitle: 'Founder, YAFT Designs, and Head of Design and Automation, VS-CRAFT Facades & Roofing',
    url: 'https://www.linkedin.com/in/yokes-marapa-791b06216/',
  },
  hasCredential: {
    '@type': 'EducationalOccupationalCredential',
    name: 'Authorized Rhino Training Center (ARTC)',
    credentialCategory: 'certification',
    recognizedBy: { '@type': 'Organization', name: 'McNeel and Associates', url: 'https://www.rhino3d.com' },
  },
};

const INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Wearables & Product Design',
  'Institutional workshop',
  'Consulting project',
];

const HOME_COURSE_CARDS = [
  { title: 'Rhino3D for Architecture', img: '/assets/images/courses/rhino-architecture.jpg', alt: 'Rhino3D for Architecture', tag: 'Beginner → Inter', dbSlug: 'rhino-architecture' },
  { title: 'Grasshopper for Computational Design', img: '/assets/images/courses/grasshopper-architecture.jpg', alt: 'Grasshopper', tag: 'Basic → Advanced', dbSlug: 'grasshopper-architecture' },
  { title: 'Rhino.Inside.Revit', img: '/assets/images/courses/revit-rhino-inside.jpg', alt: 'Rhino.Inside.Revit', tag: 'Advanced', dbSlug: 'revit-rhino-inside' },
  { title: 'Rhino3D for AEC & Climate Design', img: '/assets/images/courses/rhino-aec-climate.jpg', alt: 'AEC & Climate Design', tag: 'Intermediate', dbSlug: 'rhino-aec-climate' },
  { title: 'Wearables & Product Design', img: '/assets/images/courses/rhino-wearables-footwear.jpg', alt: 'Wearables & Product Design', tag: 'All levels', dbSlug: null },
  { title: 'Industrial Design', img: '/assets/images/courses/rhino-industrial-design.jpg', alt: 'Industrial Design', tag: 'All levels', dbSlug: 'rhino-industrial-design' },
] as const;

const FAQ_ITEMS = [
  { q: 'Do you sell Rhino software or licenses?', a: 'No. YAFT Designs is a training and consulting business only. For licenses, go directly to McNeel at rhino3d.com.' },
  { q: 'Is training online or in person?', a: 'Both. In-person sessions run from our Coimbatore base; remote sessions are available for individuals, teams, and institutions anywhere in the world.' },
  { q: 'Who are the courses for?', a: 'Architecture and design students, working professionals, and studio or contractor teams who need computational design skills.' },
  { q: 'Can YAFT run a workshop at our institution?', a: "Yes, we've delivered workshops at IIT Kharagpur and NIT Tiruchirappalli, and hold ongoing visiting faculty roles at VIT Vellore, CAT Trivandrum and ASADI. Reach out with your dates and group size." },
  { q: 'Do you train students outside India?', a: 'Yes. We offer live online training to students and professionals across Australia, Singapore, Indonesia, Philippines, Japan, Hong Kong, Malaysia and beyond. Time zones are accommodated on request.' },
  { q: 'Can studios in Australia, Singapore or the Middle East hire YAFT for consulting?', a: 'Yes. We provide computational design consulting, facade scripting, and BIM automation remotely for studios and contractors across Asia Pacific and Middle East and the Middle East including UAE, Saudi Arabia, Qatar and Oman.' },
];

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

const LOCAL_BUSINESS_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'YAFT Designs',
  description: 'Authorized Rhino Training Center offering Rhino3D, Grasshopper, and Rhino.Inside.Revit training and computational design consulting.',
  url: 'https://www.yaftdesigns.com',
  telephone: '',
  email: 'yaftdesigns@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Perundurai Industrial Park',
    addressLocality: 'Coimbatore',
    addressRegion: 'Tamil Nadu',
    postalCode: '638052',
    addressCountry: 'IN',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 11.0168,
    longitude: 76.9558,
  },
  openingHours: 'Mo-Sa 09:00-18:00',
  priceRange: '₹₹',
  currenciesAccepted: 'INR',
  paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  areaServed: [
    { '@type': 'Country', name: 'India' },
    { '@type': 'Country', name: 'Australia' },
    { '@type': 'Country', name: 'Singapore' },
    { '@type': 'Country', name: 'Indonesia' },
    { '@type': 'Country', name: 'Philippines' },
    { '@type': 'Country', name: 'Japan' },
    { '@type': 'Country', name: 'Hong Kong' },
    { '@type': 'Country', name: 'Malaysia' },
    { '@type': 'Country', name: 'Oman' },
    { '@type': 'Country', name: 'United Arab Emirates' },
    { '@type': 'Country', name: 'Saudi Arabia' },
    { '@type': 'Country', name: 'Qatar' },
    { '@type': 'Country', name: 'Bahrain' },
    { '@type': 'Country', name: 'Kuwait' },
    { '@type': 'City', name: 'Coimbatore' },
    { '@type': 'City', name: 'Chennai' },
    { '@type': 'City', name: 'Bangalore' },
    { '@type': 'City', name: 'Sydney' },
    { '@type': 'City', name: 'Singapore' },
    { '@type': 'City', name: 'Jakarta' },
    { '@type': 'City', name: 'Manila' },
    { '@type': 'City', name: 'Tokyo' },
  ],
  sameAs: [
    'https://www.linkedin.com/in/yokes-marapa-791b06216/',
    'https://www.instagram.com/yaft_designs/',
    'https://www.youtube.com/@yaftdesigns',
    'https://www.rhino3d.com/training/sites/1650/',
    'https://events.food4rhino.com/event/rhino-grasshopper-for-architecture/',
  ],
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [partners, testimonials] = await Promise.all([
    getPartners(),
    getFeaturedTestimonials(6),
  ]);
  return (
    <>
      <SiteHeader active="/" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_JSON_LD) }}
      />

      <main id="top">
        <section
          id="hero-section"
          className="hero"
          style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--line)', paddingBottom: 64, minHeight: '90vh', display: 'flex', alignItems: 'center' }}
        >
          <Hero3D />

          <div className="wrap" style={{ position: 'relative', zIndex: 10, pointerEvents: 'none', width: '100%' }}>
            <div style={{ maxWidth: 640, pointerEvents: 'auto' }}>
              <h1>Where computational design <em>is taught</em> by people who build with it.</h1>
              <p className="lede">YAFT Designs trains architects, students, and design teams in Rhino3D, Grasshopper, and Rhino.Inside.Revit, workflows we use daily on live facade and fabrication projects, not just in a classroom.</p>
              <div className="hero-actions">
                <Link href="/courses" className="btn-primary">View Courses</Link>
                <a href="#contact" className="btn-secondary">Talk to Us</a>
              </div>
              <p className="credline"><strong>Authorized Rhino Training Center (ARTC)</strong>, recognized by McNeel &amp; Associates. We teach the tools; we don&apos;t sell software licenses.</p>
            </div>
          </div>
        </section>

        <section id="about">
          <div className="wrap">
            <div className="notes-grid">
              <div className="note-card">
                <h3>McNeel-recognized</h3>
                <p>YAFT Designs is an Authorized Rhino Training Center (ARTC), recognized directly by McNeel &amp; Associates, the makers of Rhino.</p>
              </div>
              <div className="note-card">
                <h3>Academic ties</h3>
                <p>Visiting faculty at VIT Vellore, with workshops delivered at IIT Kharagpur.</p>
              </div>
              <div className="note-card">
                <h3>Fabrication-grade skills</h3>
                <p>Curriculum draws from live facade panel rationalization, unrolling, and documentation work running across five countries.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="courses" style={{ position: 'relative', overflow: 'hidden' }}>
          <ContourCanvas />
          <CoursesHeroBlock />

          <div className={styles.carouselOuter}>
            <CarouselDrag id="courseTrack" />
            <div className={styles.carouselTrack} id="courseTrack">

              {HOME_COURSE_CARDS.map((c) => {
                const detailHref = c.dbSlug ? COURSE_DETAIL_PAGES[c.dbSlug] : undefined;
                return (
                  <div className={styles.courseImgCard} key={c.title}>
                    {detailHref ? (
                      <CourseVisualLink
                        href={detailHref}
                        course={c.title}
                        slug={c.dbSlug!}
                        className={styles.courseCardVisual}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- fills a CSS-sized container (courseCardVisual) without explicit dimensions; fill mode needs a verified position:relative parent not confirmed here */}
                        <img src={c.img} alt={c.alt} draggable="false" />
                        <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                        <div className={styles.glassOverlay}></div>
                        <div className={styles.cardGradient}></div>
                      </CourseVisualLink>
                    ) : (
                      <Link href="/courses" className={styles.courseCardVisual} aria-label={`View ${c.title}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- fills a CSS-sized container (courseCardVisual) without explicit dimensions; fill mode needs a verified position:relative parent not confirmed here */}
                        <img src={c.img} alt={c.alt} draggable="false" />
                        <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                        <div className={styles.glassOverlay}></div>
                        <div className={styles.cardGradient}></div>
                      </Link>
                    )}
                    <div className={styles.cardContent}>
                      <span className={styles.cardTag}>{c.tag}</span>
                      <h3 className={styles.cardTitle}>{c.title}</h3>
                      <div className={styles.cardCtaRow}>
                        <EnquireLink course={c.title} />
                        {detailHref && <CourseGateButton href={detailHref} course={c.title} slug={c.dbSlug!} />}
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          <CarouselProgress trackId="courseTrack" />

          <div className={styles.carouselTagline}>
            <p className={styles.carouselTaglineSub}>Not tool tutorials. Structured masterclasses drawn from live facade, fabrication, and computational design projects across five countries. You leave with skills that land in your portfolio, your studio, and your next brief, not just your software menu.</p>
          </div>
        </section>

        <section id="services" className={styles.servicesSection}>
          <div className="wrap">
            <div className={styles.servicesHead}>
              <div className="eyebrow">SERVICES</div>
              <div className="section-head">
                <h2>Beyond the classroom</h2>
              </div>
            </div>
            <ServicesCarousel />
          </div>
        </section>

        <section id="projects" className="dark">
          <div className="wrap">
            <div className="eyebrow">TRACK RECORD</div>
            <div className="section-head">
              <h2>What we teach is what we build.</h2>
            </div>
            <p className={styles.trackLede}>YAFT Designs&apos; course content stays grounded in current production problems, drawn from exactly these workflows used on live international projects.</p>
            <div className={styles.trackGrid}>
              <div className={styles.trackCard}>
                <span className={styles.place}>Hong Kong</span>
                <h3>Stadium roof aluminium panels</h3>
                <p>Sheet metal unroll documentation for 2000+ panels, scripted end-to-end in Grasshopper.</p>
              </div>
              <div className={styles.trackCard}>
                <span className={styles.place}>India</span>
                <h3>Vande Bharat cockpit facelift</h3>
                <p>Design through FRP manufacture and 3D mold production, with INTO Designs.</p>
                <Link href="/projects/vande-bharat-cockpit" className={styles.trackCardLink}>Full case study →</Link>
              </div>
              <div className={styles.trackCard}>
                <span className={styles.place}>Singapore / Australia / Oman</span>
                <h3>Facade &amp; roofing documentation</h3>
                <p>Panel rationalization and fabrication drawing pipelines across multiple international projects.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faculty">
          <div className="wrap">
            <h2 className={styles.testiHeading}>What our students actually say</h2>
            <p className={styles.testiSubheading}>What it&apos;s actually like to learn with us.</p>
            <div className={styles.testiSection}>
              <TestimonialRotator testimonials={testimonials} />
              <div className={styles.portraitBlock}>
                <div className={styles.portraitFrame}>
                  <div className={styles.portraitBackdrop}></div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/images/profile-cutout.png" alt="Yokes Marapa" className={styles.portraitCutout} loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
          </div>

          {partners.length > 0 && (
            <div className={styles.marqueeWrap}>
              <div className={styles.glassPanel}>
                <div className={styles.marqueeMask}>
                  <div className={styles.marqueeTrack}>
                    {[...partners, ...partners].map((p, i) => (
                      <div className={styles.marqueeItem} key={`${p.id}-${i}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.logo_url && <img src={p.logo_url} alt={p.name} loading="lazy" decoding="async" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section id="faq">
          <div className="wrap">
            <div className="eyebrow">NOTES &amp; CLARIFICATIONS</div>
            <div className="section-head"><h2>Frequently asked</h2></div>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        <section id="contact">
          <div className="wrap">
            <div className="eyebrow">CONTACT</div>
            <div className="section-head"><h2>Start a course or project enquiry</h2></div>

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
      <CourseGateModal />
    </>
  );
}
