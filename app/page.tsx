import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import EnquireLink from '@/components/EnquireLink';
import FaqAccordion from '@/components/FaqAccordion';
import Hero3D from '@/components/Hero3D';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import CarouselDrag from '@/components/CarouselDrag';
import CarouselProgress from '@/components/CarouselProgress';
import ContourCanvas from '@/components/ContourCanvas';
import CoursesHeroBlock from '@/components/CoursesHeroBlock';
import FeatureWall from '@/components/FeatureWall';
import { getStudentWork, getPublications, getPartners } from '@/lib/feature-wall';
import styles from './home.module.css';

const TITLE = 'Authorized Rhino3D Trainer India | Grasshopper Training Asia Pacific | YAFT Designs';
const DESCRIPTION =
  'Authorized Rhino3D Training Center based in India. Rhino3D, Grasshopper, BIM and Computational Design training online for architects and designers across India, Australia, Singapore, Indonesia, Philippines and Japan.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/',
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

const AREA_SERVED_CITIES = [
  'Coimbatore', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Pune',
  'Delhi', 'Kolkata', 'Ahmedabad', 'Visakhapatnam', 'Kochi', 'Trichy',
  'Madurai', 'Jaipur', 'Chandigarh',
  'Sydney', 'Melbourne', 'Brisbane', 'Perth',
  'Singapore',
  'Jakarta', 'Surabaya', 'Bali',
  'Manila', 'Cebu',
  'Tokyo', 'Osaka',
  'Hong Kong', 'Kuala Lumpur', 'Dubai', 'Muscat',
];

const AREA_SERVED_COUNTRIES = [
  'India', 'Australia', 'Singapore', 'Indonesia',
  'Philippines', 'Japan', 'Hong Kong', 'Malaysia',
  'Oman', 'United Arab Emirates',
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
  url: 'https://yaftdesigns.com',
  logo: 'https://yaftdesigns.com/assets/images/og-image.jpg',
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
    areaServed: ['IN', 'AU', 'SG', 'ID', 'PH', 'JP', 'HK', 'MY', 'OM', 'AE'],
    availableLanguage: ['English', 'Tamil'],
  },
  sameAs: [
    'https://www.linkedin.com/in/yokes-marapa-791b06216/',
    'https://www.instagram.com/yaft_designs/',
    'https://www.youtube.com/@yaftdesigns',
    'https://www.rhino3d.com/training/sites/1650/',
  ],
  founder: {
    '@type': 'Person',
    name: 'Yokes Marapa',
    jobTitle: 'Founder and Authorized Rhino Trainer',
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

const FAQ_ITEMS = [
  { q: 'Do you sell Rhino software or licenses?', a: 'No. YAFT Designs is a training and consulting business only. For licenses, go directly to McNeel at rhino3d.com.' },
  { q: 'Is training online or in person?', a: 'Both. In-person sessions run from our Coimbatore base; remote sessions are available for individuals, teams, and institutions anywhere in the world.' },
  { q: 'Who are the courses for?', a: 'Architecture and design students, working professionals, and studio or contractor teams who need computational design skills.' },
  { q: 'Can YAFT run a workshop at our institution?', a: "Yes, we've delivered workshops at IIT Kharagpur and hold ongoing visiting faculty roles at VIT Vellore, CAT Trivandrum and ASADI. Reach out with your dates and group size." },
  { q: 'Do you train students outside India?', a: 'Yes. We offer live online training to students and professionals across Australia, Singapore, Indonesia, Philippines, Japan, Hong Kong, Malaysia and beyond. Time zones are accommodated on request.' },
  { q: 'Can studios in Australia or Singapore hire YAFT for consulting?', a: 'Yes. We provide computational design consulting, facade scripting, and BIM automation remotely for studios and contractors across the Asia Pacific region.' },
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
  url: 'https://yaftdesigns.com',
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
  ],
};

export default async function HomePage() {
  const [studentWork, publications, partners] = await Promise.all([
    getStudentWork(),
    getPublications(),
    getPartners(),
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

              <Link href="/courses" className={styles.courseImgCard}>
                <img src="/assets/images/courses/rhino-architecture.jpg" alt="Rhino3D for Architecture" draggable="false" />
                <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.cardGradient}></div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTag}>Beginner → Inter</span>
                  <h3 className={styles.cardTitle}>Rhino3D for Architecture</h3>
                  <span className={styles.cardCta}>Enquire</span>
                </div>
              </Link>

              <Link href="/courses" className={styles.courseImgCard}>
                <img src="/assets/images/courses/grasshopper-architecture.jpg" alt="Grasshopper" draggable="false" />
                <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.cardGradient}></div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTag}>Basic → Advanced</span>
                  <h3 className={styles.cardTitle}>Grasshopper for Computational Design</h3>
                  <span className={styles.cardCta}>Enquire</span>
                </div>
              </Link>

              <Link href="/courses" className={styles.courseImgCard}>
                <img src="/assets/images/courses/revit-rhino-inside.jpg" alt="Rhino.Inside.Revit" draggable="false" />
                <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.cardGradient}></div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTag}>Advanced</span>
                  <h3 className={styles.cardTitle}>Rhino.Inside.Revit</h3>
                  <span className={styles.cardCta}>Enquire</span>
                </div>
              </Link>

              <Link href="/courses" className={styles.courseImgCard}>
                <img src="/assets/images/courses/rhino-aec-climate.jpg" alt="AEC & Climate Design" draggable="false" />
                <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.cardGradient}></div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTag}>Intermediate</span>
                  <h3 className={styles.cardTitle}>Rhino3D for AEC &amp; Climate Design</h3>
                  <span className={styles.cardCta}>Enquire</span>
                </div>
              </Link>

              <Link href="/courses" className={styles.courseImgCard}>
                <img src="/assets/images/courses/rhino-wearables-footwear.jpg" alt="Wearables & Product Design" draggable="false" />
                <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.cardGradient}></div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTag}>All levels</span>
                  <h3 className={styles.cardTitle}>Wearables &amp; Product Design</h3>
                  <span className={styles.cardCta}>Enquire</span>
                </div>
              </Link>

              <Link href="/courses" className={styles.courseImgCard}>
                <img src="/assets/images/courses/rhino-industrial-design.jpg" alt="Industrial Design" draggable="false" />
                <div className={styles.liveBadge}><span className={styles.liveDot}></span>Live</div>
                <div className={styles.glassOverlay}></div>
                <div className={styles.cardGradient}></div>
                <div className={styles.cardContent}>
                  <span className={styles.cardTag}>All levels</span>
                  <h3 className={styles.cardTitle}>Industrial Design</h3>
                  <span className={styles.cardCta}>Enquire</span>
                </div>
              </Link>

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
            <div className={styles.servicesGrid}>

              <div className={styles.svcCard}>
                <h3 className={styles.svcTitle} style={{ color: '#40E0D0' }}>One-on-One Training</h3>
                <p className={styles.svcBody}>Paced to your project or portfolio, in person in Coimbatore or remote. Built around what you are actually working on, not a generic syllabus.</p>
                <ul className={styles.svcList}>
                  <li>Rhino3D, Grasshopper, Rhino.Inside.Revit</li>
                  <li>Sessions built around your live project</li>
                  <li>Flexible pacing, 1:1 or small cohort</li>
                  <li>Available online across India</li>
                </ul>
              </div>

              <div className={styles.svcCard}>
                <h3 className={styles.svcTitle} style={{ color: '#E6A817' }}>Institutional &amp; Corporate Training</h3>
                <p className={styles.svcBody}>Multi-day or semester-length programs for architecture schools and design firms, delivered on campus or online. Curriculum shaped to your context.</p>
                <ul className={styles.svcList}>
                  <li>Conducted at IIT Kharagpur, VIT, ASADI, NIT Trichy</li>
                  <li>Parametric design, fabrication, climate analysis</li>
                  <li>Customised to institution curriculum</li>
                  <li>Certificates issued on completion</li>
                </ul>
              </div>

              <div className={styles.svcCard}>
                <h3 className={styles.svcTitle} style={{ color: '#A78BFA' }}>Expert Mentorship</h3>
                <p className={styles.svcBody}>Embedded visiting faculty for schools adding Rhino and Grasshopper to their curriculum. Semester-length or elective module format at B.Arch and M.Arch levels.</p>
                <ul className={styles.svcList}>
                  <li>Currently at VIT Vellore and ASADI College</li>
                  <li>Semester-length or elective module format</li>
                  <li>M.Arch and B.Arch levels</li>
                  <li>Open to new institutional partnerships</li>
                </ul>
              </div>

              <div className={styles.svcCard}>
                <h3 className={styles.svcTitle} style={{ color: '#E63946' }}>Computational Consulting</h3>
                <p className={styles.svcBody}>Panel rationalization, facade scripting, and fabrication documentation for studios and contractors. Active on projects across five countries.</p>
                <ul className={styles.svcList}>
                  <li>Double-curved surface rationalization</li>
                  <li>Shop drawing automation via Grasshopper</li>
                  <li>Rhino.Inside.Revit BIM integration</li>
                  <li>Active on projects across 5 countries</li>
                </ul>
              </div>

            </div>
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
            <div className="eyebrow">FACULTY</div>
            <div className="section-head">
              <h2>Founder &amp; lead instructor</h2>
            </div>
            <div className="faculty-wrap">
              <Image src={getSiteImageUrl('profile.jpeg')} alt="Yokes Marapa" className="faculty-photo-stand" width={320} height={400} />
              <div className="faculty-text">
                <h3>Yokes Marapa</h3>
                <div className="faculty-role">Founder, YAFT Designs, Head of Design and Automations, VS-CRAFT Facades &amp; Roofing</div>
                <p>Splits time between training the next generation of computational designers and leading facade design and automation workflows on live international projects, work that spans India, Australia, Singapore, Hong Kong, and Oman.</p>
                <p>Visiting faculty at VIT Vellore, with prior workshops delivered at IIT Kharagpur. Works on BIM automation workflows, including Rhino.Inside.Revit.</p>
                <div className="badge-row">
                  <span className="badge">ARTC, McNeel &amp; Associates</span>
                  <span className="badge">Visiting Faculty, VIT Vellore</span>
                  <span className="badge">IIT Kharagpur Workshops</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '24px' }}>
                  <a href="https://www.linkedin.com/in/yokes-marapa-791b06216/" target="_blank" rel="noopener" className="profile-link">LinkedIn →</a>
                  <a href="https://www.rhino3d.com/training/sites/1650/" target="_blank" rel="noopener" className="profile-link">Rhino Trainer Listing →</a>
                </div>
              </div>
            </div>
          </div>
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
    </>
  );
}
