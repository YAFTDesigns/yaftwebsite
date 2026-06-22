import type { Metadata } from 'next';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import styles from './faculty.module.css';

export const metadata: Metadata = {
  title: 'Yokes Marapa | Authorized Rhino Trainer India',
  description:
    'Yokes Marapa is an Authorized Rhino3D Trainer in India, visiting faculty at VIT and ASADI, specializing in computational design and Grasshopper.',
  alternates: { canonical: '/faculty' },
};

const INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Wearables & Product Design',
  'Institutional workshop',
  'Consulting project',
];

export default function FacultyPage() {
  return (
    <>
      <SiteHeader active="/faculty" />

      <main id="top">
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">FACULTY</div>
            <h1>The people behind the curriculum.</h1>
            <p className="lede">YAFT Designs is led by a founder who builds these workflows daily on live projects, with guest mentors drawn from practice and academia.</p>
          </div>
        </section>

        <section id="faculty">
          <div className="wrap">
            <div className="eyebrow">LEAD INSTRUCTOR</div>
            <div className="section-head">
              <h2>Founder &amp; lead instructor</h2>
            </div>
            <div className="faculty-wrap">
              <Image src={getSiteImageUrl('profile.jpeg')} alt="Yokes Marapa" className="faculty-photo-stand" width={480} height={600} />
              <div className="faculty-text">
                <h3>Yokes Marapa</h3>
                <div className="faculty-role">Founder, YAFT Designs. Head of Design and Automations, VS-CRAFT Facades &amp; Roofing</div>
                <p>Splits time between training the next generation of computational designers and leading facade design and automation workflows on live international projects, work that spans India, Australia, Singapore, Hong Kong, and Oman.</p>
                <p>Visiting faculty at VIT Vellore, with prior workshops delivered at IIT Kharagpur. Works on BIM automation workflows, including Rhino.Inside.Revit.</p>
                <div className="badge-row">
                  <span className="badge">ARTC: McNeel &amp; Associates</span>
                  <span className="badge">Visiting Faculty, VIT Vellore</span>
                  <span className="badge">IIT Kharagpur Workshops</span>
                </div>
                <a href="https://www.linkedin.com/in/yokes-marapa-791b06216/" target="_blank" rel="noopener" className="profile-link" style={{ marginTop: 20 }}>LinkedIn →</a>
              </div>
            </div>
          </div>
        </section>

        <section id="mentors" className="dark">
          <div className="wrap">
            <div className="eyebrow">GUEST MENTORS</div>
            <div className="section-head">
              <h2>Drawn from practice and academia.</h2>
              <p className="note">Guest contributors who bring outside expertise into YAFT Designs&apos; curriculum and content.</p>
            </div>

            <div className={styles.mentorGrid}>
              <div className={styles.mentorCard}>
                <div className={styles.mentorPhotoStand}>
                  <Image src={getSiteImageUrl('mentors/kavitha-mohanraj.jpg')} alt="Kavitha Mohanraj" width={400} height={400} style={{ objectPosition: 'center 20%' }} />
                </div>
                <div className={styles.mentorCardBody}>
                  <span className={styles.mentorTag}>Guest Mentor</span>
                  <h3>Mrs. Kavitha Mohanraj</h3>
                  <div className={styles.mentorRole}>Co-Founder, INTO Designs</div>
                  <p>Collaborated on the Vande Bharat cockpit facelift, from design through FRP manufacture and 3D mold production.</p>
                  <a href="https://www.linkedin.com/in/kavithamohanraj/" target="_blank" rel="noopener" className={styles.mentorLink}>LinkedIn →</a>
                </div>
              </div>

              <div className={styles.mentorCard}>
                <div className={styles.mentorPhotoStand}>
                  <Image src={getSiteImageUrl('mentors/mohafiz-riyaz.jpg')} alt="Mohafiz Riyaz" width={400} height={400} style={{ objectPosition: 'center 25%' }} />
                </div>
                <div className={styles.mentorCardBody}>
                  <span className={styles.mentorTag}>Guest Mentor</span>
                  <h3>Mr. Mohafiz Riyaz</h3>
                  <div className={styles.mentorRole}>Professor, VIT Vellore</div>
                  <p>Collaborates on architecture education content, covering computational design methods and their place in the design curriculum.</p>
                  <a href="https://www.linkedin.com/in/mohafiz-riyaz-b2836915b/" target="_blank" rel="noopener" className={styles.mentorLink}>LinkedIn →</a>
                </div>
              </div>
            </div>
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
