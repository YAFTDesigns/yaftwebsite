import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Lightbox from '@/components/Lightbox';
import CourseGallery from '../CourseGallery';
import CourseSidebarNav from '../CourseSidebarNav';
import s from '../course.module.css';

export const metadata: Metadata = {
  title: 'Rhino3D for Wearables & Footwear | YAFT Designs',
  description: 'Design footwear, neckwear, wrist and arm bands in Rhino3D. 5-day live workshop covering NURBS topology, form-based modeling, and parametric lattice structures. Authorized Rhino Training Center.',
};

const COURSE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Rhino3D for Wearables & Footwear',
  description: 'A 5-day live workshop covering NURBS topology, form-based modeling, and parametric design for footwear, neckwear, wrist, and arm bands in Rhino3D.',
  provider: { '@type': 'Organization', name: 'YAFT Designs', sameAs: 'https://www.yaftdesigns.com' },
  url: 'https://www.yaftdesigns.com/courses/rhino-wearables-footwear',
  hasCourseInstance: [
    { '@type': 'CourseInstance', courseMode: 'Blended', courseWorkload: 'P5D', offers: { '@type': 'Offer', category: 'Personal training', price: '30000', priceCurrency: 'INR' } },
  ],
};

export default function RhinoWearablesFootwear() {
  return (
    <>
      <SiteHeader active="/courses" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(COURSE_JSON_LD) }}
      />

      <main className={s.pageGrid}>
      <div className={s.wrap}>
      <span className={s.tag}>Authorized Rhino Training Center</span>
      <h1 className={s.headline}>Rhino3D for Wearables &amp; Footwear</h1>
      <p className={s.subtitle}>Design in Rhino-3D for Wearables</p>
      <p className={s.desc}>Unlock the potential of Rhino3D in the fashion and accessories industry. This course focuses on designing wearables such as footwear, neckwear, wrist, and arm bands, equipping you with the skills to create innovative and functional pieces. Our vision is to foster intuitive modeling skills that support the development of cutting-edge wearable designs.</p>
      <div className={s.badges}>
        <span className={s.badge}>5 days / 30 hours</span>
        <span className={s.badge}>Intermediate to advanced</span>
        <span className={s.badge}>Certificate</span>
        <span className={s.badge}>Live online / Coimbatore</span>
        <span className={s.badge}>3D printing included</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>$360 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>personal</span></div>
          <div className={s.priceSub}>INR 30,000 + GST</div>
          <div className={s.priceUsd}>approx. rate · subject to change</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#enquire" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Rhino_3D_Training_for_Wearables.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Rhino3D competence for wearable and footwear design,NURBS topology and efficient modeling techniques for wearables,Basic and advanced wearable design recreation,Interoperability with other software and plugins,New design methods and workflows for wearable technology,Solid modeling, SubD modeling, and surface modeling,Parametric lattice structures using Grasshopper,3D printing from Rhino models".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course structure</p>
      <p className={s.desc}>Participants are introduced from basic to advanced course material, exploring and developing critical geometries and working with advanced surface modeling. This understanding is then applied to a number of exercises detailing the creation of clean, optimized geometry and controlled freeform shapes, covering a variety of modeling strategies for realizing an idea into a project. Learning curve may vary per individual, we stay flexible with additional individual practice time.</p>

      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 01</span><span className={s.dayTitle}>Introduction to Rhino3D for Wearables</span></div><div className={s.dayItem}>Introduction to Rhino object types and interface</div><div className={s.dayItem}>Curve creation, sole and lace typologies</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 02</span><span className={s.dayTitle}>From ideas to a complete 3D model</span></div><div className={s.dayItem}>Curve editing and simple footwear exercises</div><div className={s.dayItem}>Diagrams and conceptual models to a complete 3D model</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 03</span><span className={s.dayTitle}>Advanced footwear techniques</span></div><div className={s.dayItem}>Solid modeling: creation and editing</div><div className={s.dayItem}>SubD modeling: creation and editing</div><div className={s.dayItem}>Rendering and lattice structures using Grasshopper</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 04</span><span className={s.dayTitle}>Rhino in fashion wearables</span></div><div className={s.dayItem}>Surface modeling for neckwear and arm bands</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 05</span><span className={s.dayTitle}>Parametric modeling and output</span></div><div className={s.dayItem}>Parametric modeling using Grasshopper</div><div className={s.dayItem}>Layouts, importing and exporting</div><div className={s.dayItem}>Prototyping in 3D printing</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course gallery</p>
      <CourseGallery
        groupKey="rhino-wearables-footwear"
        images={[
          { src: '/assets/images/courses/rhino-wearables-footwear-1.jpg', caption: 'Recreating complex surfaces with reference wearables, from wireframe development to finished form' },
          { src: '/assets/images/courses/rhino-wearables-footwear-2.jpg', caption: 'Parametric lattice structures for insoles and midsoles, mapping and texturing' },
        ]}
      />

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Personal training</div><div className={s.feeNote}>exclusive of taxes</div></div><div className={s.feeAmt}>INR 30,000 + GST<div className={s.feeUsd}>approx. $360</div></div></div>
      </div>
      <div className={s.payNote}>Payment: 60% advance upon blocking of dates, 40% upon commencement of classes. Via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Computer requirements</p>
      <div className={s.reqItem}>Windows OS preferred. Laptop + charger + mouse and mouse pad mandatory.</div>
      <div className={s.reqItem}>Check full system requirements at rhino3d.com/system_requirements</div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Instructors</p>
      <div className={s.instructorCard}>
        <div className={s.avatar}>YM</div>
        <div>
          <p className={s.instructorName}>Yokes Marapa L S</p>
          <p className={s.instructorRole}>Founder and Training Manager, YAFT Designs. Lead Trainer for Rhino3D, Authorized Rhino Trainer, McNeel &amp; Associates.</p>
          <p className={s.instructorBio}>Computational designer and facade engineer with hands-on experience across international projects. Visiting faculty as Computational Designer at VIT Vellore.</p>
        </div>
      </div>
      <div className={s.instructorCard}>
        <div className={s.avatar}>B</div>
        <div>
          <p className={s.instructorName}>Brothojith</p>
          <p className={s.instructorRole}>Trainer, Days 2&ndash;5.</p>
        </div>
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Frequently asked questions</p>
      <div className={s.faqItem}><p className={s.faqQ}>Do I need prior Rhino experience?</p><p className={s.faqA}>No. The course starts from object types and interface basics before moving into wearable-specific modeling.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>Is this only for footwear?</p><p className={s.faqA}>No. The course covers footwear alongside neckwear, wrist, and arm bands, the same modeling principles apply across wearable categories.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>Is this available online?</p><p className={s.faqA}>Yes. Sessions are conducted live online or in-person at our studio in Coimbatore. Both options are available.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>How flexible is the schedule?</p><p className={s.faqA}>Learning curve may vary per individual. We are flexible with additional individual practice time beyond the scheduled duration.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>What are the payment terms?</p><p className={s.faqA}>60% advance upon blocking of dates, 40% upon commencement of classes. Payment via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</p></div>

      <hr className={s.divider} />
      <div className={s.ctaBottom}>
        <p className={s.ctaBottomText}>Ready to start? Reach out and we will schedule a free intro call.</p>
        <a href="/courses#enquire" className={s.btnPrimary}>Enquire now</a>
      </div>
    </div>
      <CourseSidebarNav current="/courses/rhino-wearables-footwear" />
    </main>

      <Lightbox
        groups={[{
          key: 'rhino-wearables-footwear',
          title: 'Rhino3D for Wearables & Footwear',
          role: 'Course gallery',
          photos: [
            { src: '/assets/images/courses/rhino-wearables-footwear-1.jpg', caption: 'Recreating complex surfaces with reference wearables, from wireframe development to finished form' },
            { src: '/assets/images/courses/rhino-wearables-footwear-2.jpg', caption: 'Parametric lattice structures for insoles and midsoles, mapping and texturing' },
          ],
        }]}
      />
      <SiteFooter />
    </>
  );
}
