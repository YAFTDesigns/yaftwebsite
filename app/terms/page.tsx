import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import styles from './terms.module.css';

export const metadata: Metadata = {
  title: 'Terms and Conditions | YAFT Designs',
  description: 'Terms and conditions for training, workshops, and consulting services offered by YAFT Designs.',
  alternates: { canonical: 'https://yaftdesigns.com/terms' },
};

const TERMS = [
  {
    title: '1. Scope',
    body: 'These terms apply to all services offered by YAFT Designs, including one-on-one training sessions, group batches, institutional workshops, visiting faculty engagements, and computational consulting projects, delivered in person or remotely.',
  },
  {
    title: '2. Booking and Payment',
    body: 'A non-refundable advance of 60% of the agreed fee is required to confirm your seat or engagement. The remaining 40% is due on or before the commencement of the first session. For institutional or multi-day workshop engagements, payment terms will be agreed upon in writing prior to commencement. All prices are quoted in Indian Rupees (INR) unless otherwise stated in writing. Any applicable bank charges or transaction fees are the responsibility of the payer.',
  },
  {
    title: '3. Cancellations and Refunds',
    body: 'Cancellations made at least 15 days before the scheduled start date are eligible for a refund of the advance payment, minus any transaction fees already incurred. Cancellations made within 15 days of the start date are not eligible for a refund of the advance. If YAFT Designs cancels or reschedules a session due to unforeseen circumstances, the student will be offered an alternative date or a full refund of the amount paid.',
  },
  {
    title: '4. Rescheduling',
    body: 'Rescheduling requests must be made at least 7 days in advance and are subject to availability. YAFT Designs will make reasonable efforts to accommodate rescheduling but cannot guarantee specific date or time slots.',
  },
  {
    title: '5. Student Discount Eligibility',
    body: 'A student discount, where offered, applies only to currently enrolled undergraduate students with a valid institutional student ID. Postgraduate, PhD, or professional students do not qualify. Students who are simultaneously employed full-time are also not eligible for the student rate.',
  },
  {
    title: '6. Course Materials and Intellectual Property',
    body: 'All course content, scripts, presentations, handouts, Grasshopper definitions, Rhino files, and any other materials provided by YAFT Designs are the intellectual property of YAFT Designs and its instructors. They are provided for individual learning use only. You may not reproduce, distribute, sell, republish, upload to any platform, or share these materials with third parties without prior written consent from YAFT Designs.',
  },
  {
    title: '7. Recordings',
    body: 'Where sessions are recorded, recordings are made available for the sole use of the enrolled student for a period of up to 45 days after the session. Recordings must not be shared, redistributed, or published in any format. Access to recordings may be revoked if these terms are violated.',
  },
  {
    title: '8. Code of Conduct',
    body: 'Students and clients are expected to engage respectfully with instructors and fellow participants at all times. YAFT Designs reserves the right to withdraw access to sessions, materials, or communication channels if a participant is found to be acting in bad faith, sharing content without permission, creating a conflict of interest, or engaging in disruptive or disrespectful conduct. No refund will be provided in such cases.',
  },
  {
    title: '9. Software and Equipment',
    body: 'YAFT Designs is a training and consulting business only. We do not sell, supply, or resell Rhino3D licenses or any other software. Students are responsible for obtaining their own valid software licenses directly from the respective vendors. Students attending in-person sessions are responsible for bringing their own laptop, mouse, charger, and any other equipment required.',
  },
  {
    title: '10. Certificates',
    body: 'On successful completion of a paid course or workshop, YAFT Designs will issue a certificate of completion. Certificates are issued by YAFT Designs, an Authorized Rhino Training Center recognized by McNeel and Associates, the makers of Rhino3D. They are not formal academic qualifications but confirm completion of training delivered by a McNeel-recognized instructor and center.',
  },
  {
    title: '11. Privacy and Communications',
    body: 'By enquiring or registering with YAFT Designs, you consent to receiving communications related to your course, session schedules, updates, and relevant announcements. YAFT Designs does not share your personal data with third parties for marketing purposes. You may request to be removed from our mailing list at any time by writing to yaftdesigns@gmail.com.',
  },
  {
    title: '12. Limitation of Liability',
    body: 'YAFT Designs is not liable for any indirect, incidental, or consequential loss or damage arising from the use of course content, software recommendations, project outcomes, or any other aspect of our services. Our total liability in any matter is limited to the amount paid for the specific engagement in question.',
  },
  {
    title: '13. Governing Law',
    body: 'These terms are governed by the laws of India. Any disputes arising from these terms or from any engagement with YAFT Designs shall be subject to the jurisdiction of the courts of Coimbatore, Tamil Nadu, India. Parties are encouraged to resolve disputes amicably before pursuing legal action.',
  },
  {
    title: '14. Amendments',
    body: 'YAFT Designs reserves the right to update these terms at any time. The most current version will be published on yaftdesigns.com. Continued engagement with YAFT Designs after any update constitutes acceptance of the revised terms.',
  },
  {
    title: '15. Contact',
    body: 'For questions, clarifications, or concerns regarding these terms, please contact us at yaftdesigns@gmail.com. Studio: Coimbatore, Tamil Nadu, India.',
  },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className="wrap">
            <div className="eyebrow">LEGAL</div>
            <h1 className={styles.title}>Terms and Conditions</h1>
            <p className={styles.updated}>Last updated: June 2026</p>
            <p className={styles.intro}>
              By registering for, enquiring about, or attending any training, workshop, or consulting engagement with YAFT Designs, you agree to the following terms.
            </p>
          </div>
        </section>

        <section className={styles.content}>
          <div className={styles.wrap}>
            {TERMS.map((term, i) => (
              <div key={i} className={styles.clause}>
                <h2 className={styles.clauseTitle}>{term.title}</h2>
                <p className={styles.clauseBody}>{term.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
