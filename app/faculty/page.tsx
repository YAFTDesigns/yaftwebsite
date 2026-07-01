import type { Metadata } from 'next';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import { getSiteImageUrl } from '@/lib/supabase/storage';
import styles from './faculty.module.css';

const TITLE = 'Yokes Marapa | Authorized Rhino Trainer India';
const DESCRIPTION =
  'Authorized Rhino Trainer certified by McNeel South Asia. Founder of YAFT Designs, visiting faculty at VIT Vellore, with workshops at IIT Kharagpur.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/faculty' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/faculty',
    type: 'profile',
    images: [{ url: 'https://yaftdesigns.com/assets/images/og-image.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://yaftdesigns.com/assets/images/og-image.jpg'],
  },
};

const PERSON_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Yokes Marapa',
  jobTitle: 'Founder and Authorized Rhino Trainer',
  url: 'https://yaftdesigns.com/faculty',
  image: 'https://yaftdesigns.com/assets/images/og-image.jpg',
  worksFor: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://yaftdesigns.com' },
  knowsAbout: ['Rhino3D', 'Grasshopper', 'Rhino.Inside.Revit', 'Computational Design', 'Parametric Design', 'BIM', 'Digital Fabrication'],
  credential: [
    {
      '@type': 'EducationalOccupationalCredential',
      name: 'Authorized Rhino Trainer (ARTC)',
      issuingOrganization: { '@type': 'Organization', name: 'McNeel South Asia', url: 'https://www.rhino3d.com' },
      credentialNumber: '24-010',
      issuedDate: '2024-05-15',
    },
  ],
  sameAs: [
    'https://www.linkedin.com/in/yokes-marapa-791b06216/',
    'https://www.instagram.com/yaft_designs/',
    'https://www.youtube.com/@yaftdesigns',
  ],
  affiliation: [{ '@type': 'Organization', name: 'VIT Vellore' }],
};

const INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Wearables & Product Design',
  'Institutional workshop',
  'Consulting project',
];

const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

export default async function FacultyPage() {
  const { data } = await fetch(`${base}/api/mentors`, { cache: 'no-store' }).then(r => r.json());
  const mentors: { name: string; role: string; bio: string; photo_key: string | null; linkedin_url: string | null }[] = data ?? [];
  return (
    <>
      <SiteHeader active="/faculty" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD) }}
      />

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
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 20 }}>
                  <a href="https://www.linkedin.com/in/yokes-marapa-791b06216/" target="_blank" rel="noopener" className="profile-link">LinkedIn →</a>
                  <a href="https://www.rhino3d.com/training/sites/1650/" target="_blank" rel="noopener" className="profile-link">Rhino Trainer Listing →</a>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 40, border: '1px solid var(--line)', padding: '20px 24px', background: 'var(--paper-2)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blueprint)', marginBottom: 14 }}>
                Certification of Achievement
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--line)' }}>
                {[
                  ['Certification', 'Authorized Rhino Trainer'],
                  ['Issuing Body', 'McNeel South Asia'],
                  ['Date', 'May 15, 2024'],
                  ['Cert. No.', '24-010'],
                ].map(([label, value], i) => (
                  <div key={label} style={{ padding: '10px 14px', borderRight: i < 3 ? '1px solid var(--line)' : undefined }}>
                    <span style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--blueprint)', marginBottom: 4 }}>
                      {label}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
              <details style={{ marginTop: 14 }}>
                <summary style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.04em', color: 'var(--blueprint)', borderBottom: '1px solid var(--blueprint)', cursor: 'pointer', display: 'inline-block' }}>
                  View Certificate →
                </summary>
                <div style={{ marginTop: 16, border: '1px solid var(--line)', padding: 4, background: 'var(--paper)', maxWidth: 640 }}>
                  <img
                    src="/assets/docs/Yokes_Marapa_ART_Certificate.jpg"
                    alt="Authorized Rhino Trainer Certificate: Yokes Marapa, McNeel South Asia, May 2024"
                    style={{ width: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                  />
                </div>
              </details>
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
              {mentors.map(m => (
                <div key={m.name} className={styles.mentorCard}>
                  <div className={styles.mentorPhotoStand}>
                    {m.photo_key && (
                      <Image src={getSiteImageUrl(m.photo_key)} alt={m.name} width={400} height={400} />
                    )}
                  </div>
                  <div className={styles.mentorCardBody}>
                    <span className={styles.mentorTag}>Guest Mentor</span>
                    <h3>{m.name}</h3>
                    <div className={styles.mentorRole}>{m.role}</div>
                    <p>{m.bio}</p>
                    {m.linkedin_url && (
                      <a href={m.linkedin_url} target="_blank" rel="noopener" className={styles.mentorLink}>LinkedIn →</a>
                    )}
                  </div>
                </div>
              ))}
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
