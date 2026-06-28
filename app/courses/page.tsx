import type { Metadata } from 'next';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import EnquireLink from '@/components/EnquireLink';
import SyllabusButton from '@/components/SyllabusButton';
import SyllabusModal from '@/components/SyllabusModal';
import { getCourses } from '@/lib/courses';
import StudentWorkMarquee from '@/components/StudentWorkMarquee';
import TestimonialsMarquee from '@/components/TestimonialsMarquee';
import TestimonialForm from '@/components/TestimonialForm';
import styles from './courses.module.css';

const TITLE = 'Rhino3D & Grasshopper Courses India | Online Training Asia Pacific and Middle East';
const DESCRIPTION =
  'Professional Rhino3D and Grasshopper training for architects and designers. Live online masterclasses available across India, Australia, Singapore, UAE, Indonesia, Philippines and Japan.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/courses' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://yaftdesigns.com/courses',
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

// Re-fetch from Supabase at most once every 5 minutes instead of only at build time.
export const revalidate = 300;

const INTEREST_OPTIONS = [
  'Rhino3D for Architecture',
  'Grasshopper for Computational Design',
  'Rhino.Inside.Revit',
  'Rhino3D for AEC & Climate',
  'Wearables & Product Design',
  'Industrial Design',
  'Institutional workshop',
];

export default async function CoursesPage() {
  const courses = await getCourses();

  const FALLBACK_COURSES = [
    { title: 'Rhino3D for Architecture', desc: 'Comprehensive Rhino3D training for architecture students and professionals.' },
    { title: 'Grasshopper for Computational Design', desc: 'Parametric and computational design using Grasshopper.' },
    { title: 'Rhino.Inside.Revit', desc: 'BIM integration using Rhino.Inside.Revit for facade and AEC workflows.' },
    { title: 'Wearables & Product Design', desc: '3D modeling for wearables, footwear, and product design using Rhino3D.' },
  ];

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@graph': (courses.length ? courses : FALLBACK_COURSES).map((course) => ({
      '@type': 'Course',
      name: course.title,
      description: course.desc,
      inLanguage: ['en', 'ta'],
      educationalLevel: 'Beginner to Advanced',
      provider: {
        '@type': 'Organization',
        name: 'YAFT Designs',
        sameAs: 'https://yaftdesigns.com',
      },
      offers: {
        '@type': 'Offer',
        category: 'Paid',
        availability: 'https://schema.org/InStock',
        url: 'https://yaftdesigns.com/courses',
      },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: ['onsite', 'online'],
        location: { '@type': 'Place', name: 'Coimbatore, Tamil Nadu, India' },
        inLanguage: 'en',
        instructor: {
          '@type': 'Person',
          name: 'Yokes Marapa',
          url: 'https://yaftdesigns.com/faculty',
        },
      },
    })),
  };

  return (
    <>
      <SiteHeader active="/courses" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />

      <main id="top">
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">COURSES</div>
            <h1>Browse our live courses in Rhino3D, Grasshopper &amp; BIM.</h1>
            <p className="lede">Hands-on, instructor-led training built around real production workflows, taught by a working computational designer, not a generic syllabus. Available in-person from Coimbatore or remote, as 1:1, group batch, or institutional format.</p>
            <div className="rating-badge"><span className="stars">★★★★★</span> Authorized Rhino Training Center <strong>, recognized by McNeel &amp; Associates</strong></div>
          </div>
        </section>

        <section id="courses">
          <div className="wrap">
            <div className="section-head">
              <h2>All courses</h2>
              <p className="note">Batch fees and start dates are shared on enquiry. Full syllabus PDFs are unlocked once, share your email &amp; LinkedIn once to view all of them.</p>
            </div>

            <div className={styles.courseGrid}>
              {courses.map((course) => (
                <div className={styles.courseCard} key={course.slug}>
                  <div className={styles.courseVisual}>
                    <Image src={course.image} alt={course.alt} width={800} height={500} />
                    <span className={styles.levelBadge}>{course.level}</span>
                    <span className={styles.durationBadge}>{course.duration}</span>
                  </div>
                  <div className={styles.courseBody}>
                    <div className={styles.courseTool}>{course.tool}</div>
                    <h3>{course.title}</h3>
                    <p className={styles.desc}>{course.desc}</p>
                    <div className={styles.courseFoot}>
                      <SyllabusButton pdf={course.pdf} course={course.title} slug={course.slug} />
                      <EnquireLink course={course.title} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="software-note">
              <span>YAFT Designs provides training and consulting only, we don&apos;t sell or resell Rhino licenses.</span>
              <span>Need the software? Get it directly from <a href="https://www.rhino3d.com" target="_blank" rel="noopener">McNeel, the makers of Rhino →</a></span>
            </div>
          </div>
        </section>

        <StudentWorkMarquee />
        <TestimonialsMarquee />
        <TestimonialForm />

        <section id="requirements" className="dark">
          <div className="wrap">
            <div className="eyebrow">BEFORE YOU ENROLL</div>
            <div className="section-head">
              <h2>What you&apos;ll need.</h2>
            </div>
            <div className="req-grid">
              <div className="req-card">
                <span className="num">REQ 01</span>
                <h3>Windows laptop</h3>
                <p>Rhino3D runs on Windows. Bring your own laptop, charger, mouse, and mouse pad, see McNeel&apos;s official system requirements at rhino3d.com.</p>
              </div>
              <div className="req-card">
                <span className="num">REQ 02</span>
                <h3>Format &amp; batch size</h3>
                <p>Choose 1:1 personal training, a small group batch, or an institutional workshop, pricing and pacing adjust accordingly.</p>
              </div>
              <div className="req-card">
                <span className="num">REQ 03</span>
                <h3>Payment terms</h3>
                <p>60% advance to confirm your seat, 40% on commencement. Group batches carry a student discount where noted, ask when you enquire.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact">
          <div className="wrap">
            <div className="eyebrow">CONTACT</div>
            <div className="section-head"><h2>Start a course enquiry</h2></div>

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
      <SyllabusModal />
    </>
  );
}
