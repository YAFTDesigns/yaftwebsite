import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import styles from '../terms/terms.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | YAFT Designs',
  description: 'How YAFT Designs collects, uses, and protects your personal data.',
  alternates: { canonical: 'https://www.yaftdesigns.com/privacy' },
};

const CLAUSES = [
  {
    title: 'Who We Are',
    body: 'YAFT Designs (GSTIN: 33ANCPY7046B1Z3) is an Authorized Rhino Training Center based in Coimbatore, Tamil Nadu, India, offering training and consulting in Rhino3D, Grasshopper, and related computational design tools. This policy explains what personal data we collect through yaftdesigns.com, how we use it, and the choices you have.',
  },
  {
    title: 'What We Collect',
    body: 'We collect the personal data you choose to give us: your name, email address, and any message you send when you submit an enquiry, unlock a course syllabus, or leave a testimonial. If you make a payment for a course or service, we also generate an invoice containing your name and contact details for that purpose. We do not collect payment card details ourselves; any payment processing is handled outside this site.',
  },
  {
    title: 'How We Use It',
    body: 'We use your data to respond to enquiries, send confirmation and follow-up emails, issue invoices and certificates, and improve our courses and site content. We do not sell, rent, or trade your personal data to third parties, and we do not use it for advertising.',
  },
  {
    title: 'Email Communications',
    body: 'When you submit an enquiry, unlock a syllabus, or receive an invoice, we send transactional emails (confirmations, invoices, certificates) through Resend, a third-party email delivery service. We do not use your email address for marketing unless you separately opt in, and every email includes a way to reply directly to us with questions.',
  },
  {
    title: 'Where Your Data Is Stored',
    body: 'Enquiries, leads, testimonials, and invoices are stored in a Supabase-hosted database with access restricted to YAFT Designs administrators. Site analytics are processed through Google Analytics 4 and a first-party analytics system described in our Cookies Policy. We take reasonable technical measures, including access controls and encrypted connections, to protect this data.',
  },
  {
    title: 'Certificates and Verification',
    body: 'If you complete a course with us, we may issue a certificate containing your name and course details, retrievable through a public verification page using a unique certificate ID. This allows third parties (such as employers) to verify a certificate is genuine without exposing any other personal data about you.',
  },
  {
    title: 'Your Rights',
    body: 'You can ask us to access, correct, or delete the personal data we hold about you at any time by emailing us at the address below. We will respond within a reasonable timeframe and delete or correct data unless we have a legitimate reason to retain it, such as an unresolved invoice or a legal obligation.',
  },
  {
    title: 'Third-Party Services',
    body: 'This site uses Google Analytics 4 for traffic analysis, Resend for transactional email, Supabase for data storage, and Vercel for hosting. Each of these providers processes data under their own privacy policies. We choose providers that meet reasonable data protection standards and only share the minimum data necessary for them to perform their function.',
  },
  {
    title: "Children's Privacy",
    body: 'Our courses and services are intended for architects, designers, engineers, and students at a college level or above. We do not knowingly collect personal data from children under 13.',
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this policy from time to time to reflect changes in our practices or for legal reasons. The date below reflects the most recent update. Continued use of the site after a change means you accept the revised policy.',
  },
  {
    title: 'Contact Us',
    body: 'For any questions about this policy or your personal data, email us at yaftdesigns@gmail.com.',
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className="wrap">
            <div className="eyebrow">LEGAL</div>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.updated}>Last updated: July 2026</p>
            <p className={styles.intro}>
              This policy explains what personal data yaftdesigns.com collects and how we use it. For related policies see our{' '}
              <a href="/terms" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>Terms</a>{' '}and{' '}
              <a href="/cookies" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>Cookies</a>{' '}pages.
            </p>
          </div>
        </section>

        <section className={styles.content}>
          <div className={styles.wrap}>
            {CLAUSES.map((clause, i) => (
              <div key={i} className={styles.clause}>
                <h2 className={styles.clauseTitle}>{clause.title}</h2>
                <p className={styles.clauseBody}>{clause.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
