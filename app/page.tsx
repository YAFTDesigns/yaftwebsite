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

export const metadata: Metadata = {
  title: 'Authorized Rhino3D Trainer India | Grasshopper Training | YAFT Designs',
  description:
    'Authorized Rhino3D Training in India. Rhino3D, Grasshopper, BIM Consulting, Computational Design and Parametric Design services.',
  alternates: { canonical: '/' },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'YAFT Designs',
      url: 'https://yaftdesigns.com',
      description: 'Computational Design, Rhino3D Training, Grasshopper Training and BIM Consulting Services.',
      founder: { '@type': 'Person', name: 'Yokes Marapa' },
    },
    {
      '@type': 'Person',
      name: 'Yokes Marapa',
      jobTitle: 'Authorized Rhino Trainer | Computational Design Consultant',
      worksFor: { '@type': 'Organization', name: 'YAFT Designs' },
      url: 'https://yaftdesigns.com/faculty',
      description: 'Authorized Rhino3D Trainer in India, Visiting Faculty, Computational Designer and BIM Consultant.',
      knowsAbout: [
        'Rhino3D',
        'Grasshopper',
        'Computational Design',
        'Parametric Design',
        'BIM Consulting',
        'Digital Fabrication',
        'Facade Design',
      ],
    },
  ],
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

export default function HomePage() {
  return (
    <>
      <SiteHeader active="/" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
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
              <h2>Courses</h2>
              <p className="note">One-on-one, small cohort, or institutional workshop format. Enquire for the next available batch.</p>
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

        <section id="services">
          <div className="wrap">
            <div className="eyebrow">SERVICES</div>
            <div className="section-head">
              <h2>Beyond the classroom</h2>
            </div>
            <div className={styles.servicesList}>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>01</span>
                <h3>One-on-one training</h3>
                <p>Paced to your project or portfolio, in person in Coimbatore or remote, for individuals or small teams.</p>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>02</span>
                <h3>Institutional workshops</h3>
                <p>Multi-day or semester-length programs for architecture schools, delivered on campus or online.</p>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>03</span>
                <h3>Visiting faculty</h3>
                <p>Structured computational design modules for design schools looking to add Rhino and Grasshopper to their curriculum.</p>
              </div>
              <div className={styles.serviceRow}>
                <span className={styles.idx}>04</span>
                <h3>Computational design consulting</h3>
                <p>Panel rationalization, facade scripting, and fabrication documentation for studios and contractors who need outsourced computational expertise.</p>
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
              <Image src={getSiteImageUrl('profile.jpeg')} alt="Yokes Marapa" className="faculty-photo-stand" width={480} height={600} />
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
