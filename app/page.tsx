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
import styles from './home.module.css';

const TITLE = 'Authorized Rhino3D Trainer India | Grasshopper Training | YAFT Designs';
const DESCRIPTION =
  'Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/',
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

const AREA_SERVED_CITIES = [
  'Coimbatore', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Pune',
  'Delhi', 'Kolkata', 'Ahmedabad', 'Visakhapatnam', 'Kochi', 'Trichy',
  'Madurai', 'Jaipur', 'Chandigarh',
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'YAFT Designs',
  alternateName: 'YAFT Designs Computational Design Training',
  url: 'https://yaftdesigns.com',
  logo: 'https://yaftdesigns.com/assets/logos/rhino_logo.jpeg',
  description:
    'Authorized Rhino Training Center recognized by McNeel and Associates. Offering Rhino3D, Grasshopper, and Rhino.Inside.Revit training across India and online.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Coimbatore',
    addressRegion: 'Tamil Nadu',
    addressCountry: 'IN',
  },
  areaServed: [
    ...AREA_SERVED_CITIES.map((name) => ({ '@type': 'City', name })),
    { '@type': 'Country', name: 'India' },
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'yaftdesigns@gmail.com',
    contactType: 'customer support',
    areaServed: 'IN',
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
  { q: 'Is training online or in person?', a: 'Both. In-person sessions run from our Coimbatore base; remote sessions are available for individuals, teams, and institutions anywhere.' },
  { q: 'Who are the courses for?', a: 'Architecture and design students, working professionals, and studio/contractor teams who need computational design skills.' },
  { q: 'Can YAFT run a workshop at our institution?', a: "Yes, we've delivered workshops at IIT Kharagpur and hold ongoing visiting faculty roles at VIT Vellore, CAT Trivandrum and ASADI. Reach out with your dates and group size." },
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

export default function HomePage() {
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

        <section id="courses">
          <div className="wrap">
            <div className="eyebrow">COURSES</div>
            <div className="section-head">
              <h2>A selection of courses</h2>
              <p className="note">6 courses available. <Link href="/courses" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>See the full list →</Link></p>
            </div>

            <div className={styles.courseGrid}>
              <div className={styles.courseCard}>
                <div className={styles.courseTop}>
                  <h3>Rhino3D for Architecture</h3>
                  <span className={styles.courseTag}>Beginner→Inter</span>
                </div>
                <p>NURBS modeling fundamentals through to freeform architectural geometry, documentation, and presentation-ready output.</p>
                <div className={styles.courseFoot}>
                  <span className={styles.fmt}>1:1 or cohort</span>
                  <EnquireLink course="Rhino3D for Architecture" />
                </div>
              </div>

              <div className={styles.courseCard}>
                <div className={styles.courseTop}>
                  <h3>Grasshopper for Computational Design</h3>
                  <span className={styles.courseTag}>Intermediate</span>
                </div>
                <p>Parametric logic, data structures, and rationalization workflows, built around real panel and facade problems from live projects.</p>
                <div className={styles.courseFoot}>
                  <span className={styles.fmt}>1:1 or cohort</span>
                  <EnquireLink course="Grasshopper for Computational Design" />
                </div>
              </div>

              <div className={styles.courseCard}>
                <div className={styles.courseTop}>
                  <h3>Rhino.Inside.Revit</h3>
                  <span className={styles.courseTag}>Advanced</span>
                </div>
                <p>Bridging parametric Rhino/Grasshopper workflows directly into Revit, for teams who need both design freedom and BIM compliance.</p>
                <div className={styles.courseFoot}>
                  <span className={styles.fmt}>1:1 or team</span>
                  <EnquireLink course="Rhino.Inside.Revit" />
                </div>
              </div>

              <div className={styles.courseCard}>
                <div className={styles.courseTop}>
                  <h3>Wearables &amp; Product Design</h3>
                  <span className={styles.courseTag}>All levels</span>
                </div>
                <p>Applying Rhino and Grasshopper to wearable and product geometry, fit, surface continuity, and prep for fabrication or 3D printing.</p>
                <div className={styles.courseFoot}>
                  <span className={styles.fmt}>1:1 or workshop</span>
                  <EnquireLink course="Wearables & Product Design" />
                </div>
              </div>
            </div>

            <div className="software-note">
              <span>YAFT Designs provides training and consulting only, we don&apos;t sell or resell Rhino licenses.</span>
              <span>Need the software? Get it directly from <a href="https://www.rhino3d.com" target="_blank" rel="noopener">McNeel, the makers of Rhino →</a></span>
            </div>
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
            <div className={styles.servicesList}>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>01</span>
                <span className={styles.serviceArrow}>↗</span>
                <h3>One-on-one training</h3>
                <p>Paced to your project or portfolio, in person in Coimbatore or remote, for individuals or small teams.</p>
                <ul className={styles.serviceBullets}>
                  <li>Rhino3D, Grasshopper, Rhino.Inside.Revit</li>
                  <li>Sessions built around your live project</li>
                  <li>Flexible pacing, 1:1 or small cohort</li>
                  <li>Available online across India</li>
                </ul>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>02</span>
                <span className={styles.serviceArrow}>↗</span>
                <h3>Instructional and corporate training</h3>
                <p>Multi-day or semester-length programs for architecture schools, delivered on campus or online.</p>
                <ul className={styles.serviceBullets}>
                  <li>Conducted at IIT Kharagpur, VIT, ASADI, NIT Trichy</li>
                  <li>Parametric design, fabrication, climate analysis</li>
                  <li>Customised to the institution&apos;s curriculum</li>
                  <li>Certificates issued on completion</li>
                </ul>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>03</span>
                <span className={styles.serviceArrow}>↗</span>
                <h3>Expert mentorship</h3>
                <p>Structured computational design modules for schools looking to add Rhino and Grasshopper to their curriculum.</p>
                <ul className={styles.serviceBullets}>
                  <li>Currently at VIT Vellore and ASADI College</li>
                  <li>Semester-length or elective module format</li>
                  <li>M.Arch and B.Arch levels</li>
                  <li>Open to new institutional partnerships</li>
                </ul>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>04</span>
                <span className={styles.serviceArrow}>↗</span>
                <h3>Computational consulting</h3>
                <p>Panel rationalization, facade scripting, and fabrication documentation for studios and contractors.</p>
                <ul className={styles.serviceBullets}>
                  <li>Double-curved surface rationalization</li>
                  <li>Shop drawing automation via Grasshopper</li>
                  <li>Rhino.Inside.Revit BIM integration</li>
                  <li>Active on projects across 5 countries</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="featured" className={styles.reelsSection}>
          <div className="wrap">
            <div className={styles.reelsHead}>
              <div className="eyebrow">FEATURED IN</div>
              <div className="section-head">
                <h2>As seen on campus.</h2>
                <p className="note">Reels published by partner institutions featuring workshops by YAFT Designs.</p>
              </div>
            </div>
            <div className={styles.reelsGrid}>
              <div className={styles.reelCard}>
                <a href="https://www.instagram.com/reel/DFskbDUTFN2/" target="_blank" rel="noopener" className={styles.reelThumb}>
                  <Image src="/assets/images/reel-cat.jpg" alt="CAT Trivandrum workshop" fill style={{ objectFit: 'cover' }} />
                  <div className={styles.reelPlay}><div className={styles.playTri}></div></div>
                </a>
                <div className={styles.reelMeta}>
                  <div className={styles.reelCollege}>CAT Trivandrum</div>
                  <div className={styles.reelTitle}>Parametric Design Workshop</div>
                  <a href="https://www.instagram.com/reel/DFskbDUTFN2/" target="_blank" rel="noopener" className={styles.reelLink}>Watch on Instagram ↗</a>
                </div>
              </div>
              <div className={styles.reelCard}>
                <a href="https://www.instagram.com/reel/DVf0vL0oEbr/" target="_blank" rel="noopener" className={styles.reelThumb}>
                  <Image src="/assets/images/reel-srm.jpg" alt="SRM SEAD workshop" fill style={{ objectFit: 'cover' }} />
                  <div className={styles.reelPlay}><div className={styles.playTri}></div></div>
                </a>
                <div className={styles.reelMeta}>
                  <div className={styles.reelCollege}>SRM SEAD Campus, Chennai</div>
                  <div className={styles.reelTitle}>Computational Design Workshop</div>
                  <a href="https://www.instagram.com/reel/DVf0vL0oEbr/" target="_blank" rel="noopener" className={styles.reelLink}>Watch on Instagram ↗</a>
                </div>
              </div>
              <div className={styles.reelCard}>
                <a href="https://www.instagram.com/reel/DVv4NHyDn0-/" target="_blank" rel="noopener" className={styles.reelThumb}>
                  <Image src="/assets/images/reel-vit.jpg" alt="VIT Vellore workshop" fill style={{ objectFit: 'cover' }} />
                  <div className={styles.reelPlay}><div className={styles.playTri}></div></div>
                </a>
                <div className={styles.reelMeta}>
                  <div className={styles.reelCollege}>VIT Vellore</div>
                  <div className={styles.reelTitle}>Performative Plugins: Data Driven Simulations</div>
                  <a href="https://www.instagram.com/reel/DVv4NHyDn0-/" target="_blank" rel="noopener" className={styles.reelLink}>Watch on Instagram ↗</a>
                </div>
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
