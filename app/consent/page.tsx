import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import styles from '../terms/terms.module.css';

export const metadata: Metadata = {
  title: 'Consent Policy | YAFT Designs',
  description: 'Consent policy for online sessions, recordings, photography, and code of conduct at YAFT Designs.',
  alternates: { canonical: 'https://yaftdesigns.com/consent' },
};

const CLAUSES = [
  {
    title: 'Online Sessions',
    items: [
      'When participating in sessions conducted via Zoom, Google Meet, or similar platforms, you have the ability to share your screen with the instructor. This may inadvertently display private information to other participants. YAFT Designs is not liable for any private information you unintentionally share during a session.',
      'If you participate in online sessions and choose to activate your camera, this will be taken as your consent to being viewed by the instructor and, where applicable, other participants. You retain the right to deactivate your camera and microphone at any time.',
      'Each third-party platform used for sessions, including Zoom and Google Meet, operates under its own terms and conditions. These are independent of YAFT Designs and should be reviewed separately.',
      'Session recordings, where provided, will be sent only to the personal email address used at registration. They will not be shared with institutional or business email addresses unless expressly agreed in writing.',
    ]
  },
  {
    title: 'Recordings and Intellectual Property',
    items: [
      'Sessions conducted by YAFT Designs, whether online or in person, and any recordings thereof, remain the intellectual property of YAFT Designs.',
      'YAFT Designs reserves the right to use recorded session material for educational, promotional, or commercial purposes. By attending a session, you provide consent to this use.',
      'You agree not to hold YAFT Designs liable for any issues arising from the use of recorded material in the manner described above.',
      'Students and participants must not record, screenshot, or capture any session content without prior written permission from YAFT Designs.',
    ]
  },
  {
    title: 'Code of Conduct',
    items: [
      'All students, participants, and attendees are expected to treat instructors and fellow participants with respect at all times, whether in person or online.',
      'Unauthorized photography, screen recording, or video capture during sessions is strictly prohibited. Violation of this may result in immediate termination of access without a refund. YAFT Designs reserves the right to pursue legal action where applicable.',
      'YAFT Designs cannot be held accountable for technical difficulties experienced by students or participants during online sessions.',
    ]
  },
  {
    title: 'Use of Photography, Video, and Audio',
    items: [
      'YAFT Designs may photograph workshops, sessions, and events and use these images on our website, LinkedIn, Instagram, YouTube, or other platforms and printed materials.',
      'Similarly, YAFT Designs may record video and audio during sessions and workshops. These recordings may be featured on platforms including but not limited to our website, YouTube, Instagram, and LinkedIn, in both online and offline formats.',
      'By attending or participating in any YAFT Designs session, workshop, or event, you consent to the above uses of your image, voice, and likeness, and exempt YAFT Designs from any breach of privacy claims related to such use.',
      'If you do not wish to be photographed or recorded, please notify us in writing before the session begins at yaftdesigns@gmail.com.',
    ]
  },
];

export default function ConsentPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className="wrap">
            <div className="eyebrow">LEGAL</div>
            <h1 className={styles.title}>Consent Policy</h1>
            <p className={styles.updated}>Last updated: June 2026</p>
            <p className={styles.intro}>
              By registering for or attending any training, workshop, or session with YAFT Designs, you agree to the following consent policy alongside our{' '}
              <a href="/terms" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>Terms and Conditions</a>.
            </p>
          </div>
        </section>

        <section className={styles.content}>
          <div className={styles.wrap}>
            {CLAUSES.map((section, i) => (
              <div key={i} className={styles.clause}>
                <h2 className={styles.clauseTitle}>{section.title}</h2>
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  {section.items.map((item, j) => (
                    <li key={j} style={{
                      fontSize: 15,
                      lineHeight: 1.8,
                      color: 'var(--ink-soft)',
                      marginBottom: 12,
                      paddingLeft: 8,
                    }}>{item}</li>
                  ))}
                </ol>
              </div>
            ))}

            <div className={styles.clause}>
              <h2 className={styles.clauseTitle}>Contact</h2>
              <p className={styles.clauseBody}>
                For questions or concerns regarding this consent policy, please contact us at{' '}
                <a href="mailto:yaftdesigns@gmail.com" style={{ color: 'var(--brass)' }}>yaftdesigns@gmail.com</a>.
                Studio: Coimbatore, Tamil Nadu, India.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
