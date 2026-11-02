import type { Metadata } from 'next';
import CourseActions from '@/components/CourseActions';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Lightbox from '@/components/Lightbox';
import CourseGallery from '../CourseGallery';
import CourseSidebarNav from '../CourseSidebarNav';
import s from '../course.module.css';
import { imageUrl } from '@/lib/assetUrl';
import { getCoursePricing, usdApprox, fmtInr, PAYMENT_NOTE } from '@/lib/coursePricing';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Rhino3D for Industrial Design',
  description: 'Re-Imagining Parametric Design for industrial designers. 5-day Rhino3D workshop covering NURBS, SubD, Grasshopper basics, CNC-ready geometry and parametric digital assembly.',
};

const COURSE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Rhinoceros for Industrial Design',
  description: 'A 5-day Rhino3D workshop for industrial designers covering NURBS, SubD, Grasshopper basics, CNC-ready geometry, and parametric digital assembly.',
  provider: { '@type': 'Organization', name: 'YAFT Designs', sameAs: 'https://www.yaftdesigns.com' },
  url: 'https://www.yaftdesigns.com/courses/rhino3d-industrial-design',
  hasCourseInstance: [],
};

export default async function Rhino3DIndustrialDesign() {
  const { fee, combo } = await getCoursePricing('rhino-industrial-design');
  const ld = { ...COURSE_JSON_LD, hasCourseInstance: [{ '@type': 'CourseInstance', courseMode: 'Blended', courseWorkload: 'P5D', offers: { '@type': 'Offer', category: 'Course fee (excl. 18% GST)', price: String(fee), priceCurrency: 'INR' } }] };
  return (
    <>
      <SiteHeader active="/courses" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <main className={s.pageGrid}>
      <div className={s.wrap}>
      <span className={s.tag}>Authorized Rhino Training Center</span>
      <h1 className={s.headline}>Rhino3D for Industrial Design</h1>
      <p className={s.subtitle}>Re-Imagining Parametric Design Workshop</p>
      <p className={s.desc}>A 5-day intensive for industrial and product designers covering Rhino fundamentals, hybrid surface and solid modeling, Grasshopper basics for CNC parts, and parametric digital assembly techniques for fabrication-ready output.</p>
      <div className={s.badges}>
        <span className={s.badge}>5 days / 30 hours</span>
        <span className={s.badge}>Beginner to advanced</span>
        <span className={s.badge}>Certificate</span>
        <span className={s.badge}>Live online / Coimbatore</span>
        <span className={s.badge}>CNC and fabrication focus</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>${usdApprox(fee)} <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>course fee</span></div>
          <div className={s.priceSub}>INR {fmtInr(fee)} + GST</div>
          <div className={s.priceUsd}>approx. rate · subject to change</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#contact" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Rhino_3D_Training_for_Industrial_Design.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Rhino interface, units, tolerances and precision curves,Solid modeling with CNC mindset,Hybrid surface and solid modeling: Loft, SubD, BlendSrf,CNC-friendly part creation and breakdown,Grasshopper basics for parametric CNC parts,Sliders, offsets and dogbone logic for machine-ready geometry,Grasshopper automation for perforated panels and batch DXF export,Parametric digital assembly technique".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 01</span><span className={s.dayTitle}>Introduction to Rhinoceros</span></div><div className={s.dayItem}>Rhino interface, units, tolerances and precision curve drawing with CNC mindset</div><div className={s.dayItem}>Basic solids: tool diameter, fillets and manufacturable geometry</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 02</span><span className={s.dayTitle}>Surface and industrial form modeling</span></div><div className={s.dayItem}>Hybrid surface + solid modeling using Loft, SubD, and BlendSrf</div><div className={s.dayItem}>Creating smooth product shells and breaking them into CNC-friendly parts</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 03</span><span className={s.dayTitle}>Advanced solids and assemblies</span></div><div className={s.dayItem}>Hybrid surface + solid modeling for industrial forms</div><div className={s.dayItem}>Focus on smooth product shells and CNC-friendly parts</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 04</span><span className={s.dayTitle}>Grasshopper fundamentals for CNC design</span></div><div className={s.dayItem}>Grasshopper basics for parametric CNC parts: plates, slots and patterns</div><div className={s.dayItem}>Sliders, offsets and dogbone logic for machine-ready geometry</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 05</span><span className={s.dayTitle}>Grasshopper automation and final project</span></div><div className={s.dayItem}>Grasshopper automation for perforated panels and batch DXF export</div><div className={s.dayItem}>Mini project: parametric models and CNC files</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course gallery</p>
      <CourseGallery
        groupKey="rhino3d-industrial-design"
        images={[
          { src: imageUrl('courses/rhino-industrial-design-1.jpg'), caption: 'Voronoi and patterns, point attractors, culling and vector fields, wood decor' },
          { src: imageUrl('courses/rhino-industrial-design-2.jpg'), caption: 'Parametric digital assembly technique and twisting furniture design' },
        ]}
      />

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Course fee</div><div className={s.feeNote}>exclusive of GST (18% added at checkout) • group batches and student pricing on request</div></div><div className={s.feeAmt}>INR {fmtInr(fee)} + GST<div className={s.feeUsd}>approx. ${usdApprox(fee)}</div></div></div>
      </div>
      <CourseActions slug="rhino-industrial-design" title="Rhino3D for Industrial Design" />
      <div className={s.payNote}>{PAYMENT_NOTE}</div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Computer requirements</p>
      <div className={s.reqItem}>Windows OS preferred. Laptop + charger + mouse and mouse pad mandatory.</div>
      <div className={s.reqItem}>Check full system requirements at rhino3d.com/system_requirements</div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Instructor</p>
      
        <div className={s.instructorCard}>
          <div className={s.avatar}>YM</div>
          <div>
            <p className={s.instructorName}>Yokes Marapa L S</p>
            <p className={s.instructorRole}>Founder and Training Manager, YAFT Designs. Authorized Rhino Trainer, McNeel &amp; Associates.</p>
            <p className={s.instructorBio}>Computational designer and facade engineer with hands-on experience across international projects. Visiting faculty at VIT Vellore and ASADI College of Architecture. Conducted workshops at IIT Kharagpur. Lead trainer at YAFT Designs.</p>
          </div>
        </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Frequently asked questions</p>
      <div className={s.faqItem}><p className={s.faqQ}>Do I need prior Rhino or CNC experience?</p><p className={s.faqA}>No. The course starts from the Rhino interface and builds up to Grasshopper automation and CNC-ready output over 5 days.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>Is this relevant for furniture and product design?</p><p className={s.faqA}>Yes. The course covers digital assembly techniques, flow on surface, and parametric modeling directly applicable to furniture, product shells and decorative fabrication.</p></div>
      
        <div className={s.faqItem}><p className={s.faqQ}>Is this available online?</p><p className={s.faqA}>Yes. Sessions are conducted live online or in-person at our studio in Coimbatore. Both options are available. Students outside India join live online only.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>How flexible is the schedule?</p><p className={s.faqA}>Learning curve may vary per individual. We are flexible with additional individual practice time beyond the scheduled duration.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>What are the payment terms?</p><p className={s.faqA}>{PAYMENT_NOTE}</p></div>

      <hr className={s.divider} />
      <div className={s.ctaBottom}>
        <p className={s.ctaBottomText}>Ready to start? Reach out and we will schedule a free intro call.</p>
        <a href="/courses#contact" className={s.btnPrimary}>Enquire now</a>
      </div>
    </div>
      <CourseSidebarNav current="/courses/rhino3d-industrial-design" />
    </main>

      <Lightbox
        groups={[{
          key: 'rhino3d-industrial-design',
          title: 'Rhinoceros for Industrial Design',
          role: 'Course gallery',
          photos: [
            { src: imageUrl('courses/rhino-industrial-design-1.jpg'), caption: 'Voronoi and patterns, point attractors, culling and vector fields, wood decor' },
            { src: imageUrl('courses/rhino-industrial-design-2.jpg'), caption: 'Parametric digital assembly technique and twisting furniture design' },
          ],
        }]}
      />
      <SiteFooter />
    </>
  );
}
