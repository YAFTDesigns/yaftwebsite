import type { Metadata } from 'next';
import CourseActions from '@/components/CourseActions';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Lightbox from '@/components/Lightbox';
import CourseGallery from '../CourseGallery';
import CourseSidebarNav from '../CourseSidebarNav';
import s from '../course.module.css';
import { imageUrl } from '@/lib/assetUrl';

export const metadata: Metadata = {
  title: 'Rhino3D for AEC and Climate',
  description: 'A focused 2-day workshop on Rhino3D for AEC professionals with Grasshopper climate, daylight and comfort analysis using Ladybug and Honeybee, and facade optimisation with Galapagos.',
};

const COURSE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: 'Rhino3D for AEC & Climate',
  description: 'A 2-day workshop on Rhino3D for AEC professionals covering Grasshopper climatic analysis and facade optimization using Ladybug.',
  provider: { '@type': 'Organization', name: 'YAFT Designs', sameAs: 'https://www.yaftdesigns.com' },
  url: 'https://www.yaftdesigns.com/courses/rhino3d-aec-climate',
  hasCourseInstance: [
    { '@type': 'CourseInstance', courseMode: 'Blended', courseWorkload: 'P2D', offers: { '@type': 'Offer', category: 'Individual / group training', price: '10000', priceCurrency: 'INR' } },
  ],
};

const CL = '/assets/courses/climate';
const GALLERY = [
  { src: imageUrl('courses/rhino-aec-climate-1.jpg'), caption: 'Facade patterning with climate-driven perforation and grasshopper canvas' },
  { src: imageUrl('courses/rhino-aec-climate-2.jpg'), caption: 'Ladybug climatic analysis controlling facade opening with respect to solar radiation, referencing Al Bahar Towers' },
];
const WORKFLOW = [
  { src: `${CL}/test-building.webp`, caption: 'Test building in Rhino: two storey house with glazed gable, terrace and solar panel array. This geometry is analysed, then converted into a Honeybee model.' },
  { src: `${CL}/sun-path.webp`, caption: 'LB SunPath around the site: analemma loops for every hour, coloured by dry bulb temperature, with the analysis period set in Grasshopper' },
  { src: `${CL}/direct-sun-hours.webp`, caption: 'Direct sun hours on floor plates and terrace, with trees and terrain as context' },
  { src: `${CL}/incident-radiation.webp`, caption: 'Incident radiation on the glazed gable, floors and terrace. Warmer colour, more radiation (kWh/m2)' },
  { src: `${CL}/radiation-sky-dome.webp`, caption: 'Sky dome of solar radiation by direction: which sun is helpful and which is harmful. Credit: Chris Mackey, Ladybug Tools' },
  { src: `${CL}/honeybee-solar-study.webp`, caption: 'Honeybee solar study on a faceted pavilion: sensor grid, model and run settings' },
  { src: `${CL}/honeybee-view-analysis.webp`, caption: 'View based analysis with Radiance: image at a chosen date and hour with false colour legend' },
];

export default function Rhino3DAEC() {
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
      <h1 className={s.headline}>Rhino3D for AEC + Climate</h1>
      <p className={s.subtitle}>A Design Re-Thinking Workshop</p>
      <p className={s.desc}>Design with the sun. A focused workshop for AEC professionals covering Rhino3D fundamentals and Grasshopper-based climate, daylight and comfort analysis with Ladybug and Honeybee. Learn to read sun paths, direct sun hours and incident radiation, then optimise building orientation, facades and shading with Galapagos.</p>
      <div className={s.badges}>
        <span className={s.badge}>2 days / 10 to 15 hours</span>
        <span className={s.badge}>AEC professionals</span>
        <span className={s.badge}>Live online / On-site</span>
        <span className={s.badge}>Ladybug + Honeybee included</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>$120 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>group / individual</span></div>
          <div className={s.priceSub}>INR 10,000 · 6 hrs (3+3 sessions)</div>
          <div className={s.priceSub}>Institutions: contact for custom pricing</div>
          <div className={s.priceUsd}>approx. rate · subject to change</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#enquire" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Rhino_3D_Training_for_AEC_for_Climate.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Rhino3D fundamentals for AEC workflows,Rhino object types, interface and curve modeling,Grasshopper for climatic analysis and optimisation,Sun path, psychrometric chart and daylight hours with Ladybug,Incident radiation and radiation benefit on facades and glazing,Honeybee models for daylight and thermal comfort,Optimising shading, fins and orientation with Galapagos,Building orientation analysis and optimisation,Facade design with climate data".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>What we will calculate</p>
      <div className={s.outcomesGrid}>
        {[
          'Sun path: sun position for every hour of the year',
          'Psychrometric chart: comfort hours and passive strategies',
          'Daylight hours: direct sun on floors and facades',
          'Incident radiation: kWh/m2 on roof, walls and glazing',
          'Internal comfort: operative temperature inside zones',
          'Optimisation: Galapagos finds the best shading',
        ].map((o) => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 01</span><span className={s.dayTitle}>Introduction to Rhino3D for AEC</span></div><div className={s.dayItem}>Introduction to Rhino object types and interface</div><div className={s.dayItem}>Curve creation and modeling</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 02</span><span className={s.dayTitle}>Grasshopper: climatic analysis and optimisation</span></div><div className={s.dayItem}>Climate data and sun path, direct sun hours and incident radiation with Ladybug</div><div className={s.dayItem}>Radiation benefit: helpful and harmful sun, and what it means for facade form, massing and shading depth</div><div className={s.dayItem}>Facade designing: building analysis with respect to climate data</div><div className={s.dayItem}>Optimising facade and orientation with respect to radiation received by the super-structure</div><div className={s.dayItem}>Honeybee model from Rhino volumes: daylight with Radiance, thermal comfort with EnergyPlus</div><div className={s.dayItem}>Galapagos search: overhang depth, fin angle, glazing ratio and rotation</div><div className={s.dayItem}>Case study: Al Bahar Towers</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course gallery</p>
      <CourseGallery
        groupKey="rhino3d-aec-climate"
        images={GALLERY}
      />

      <p className={s.sectionLabel} style={{ marginTop: 28 }}>Ladybug and Honeybee workflow</p>
      <CourseGallery groupKey="rhino3d-aec-climate-workflow" wide images={WORKFLOW} />

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Individual / group training</div><div className={s.feeNote}>6 hours total, split as 3+3 sessions • incl. all taxes</div></div><div className={s.feeAmt}>INR 10,000<div className={s.feeUsd}>approx. $120</div></div></div>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Institutions / colleges</div><div className={s.feeNote}>Custom pricing, travel expenses borne by institution</div></div><div className={s.feeAmt}>Contact us</div></div>
      </div>
      <CourseActions slug="rhino-aec-climate" title="Rhino3D for AEC and Climate" />
      <div className={s.payNote}>Payment: 50% advance on booking, balance within 7 days of the invoice date. Via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</div>

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
      <div className={s.faqItem}><p className={s.faqQ}>Is this suitable for beginners?</p><p className={s.faqA}>Yes. Day 1 starts from Rhino basics. Day 2 introduces Grasshopper for climatic analysis. No prior Rhino or Grasshopper experience required.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>Can this be conducted at our institution?</p><p className={s.faqA}>Yes. We offer on-site workshops for colleges and institutions. Travel expenses are borne by the institution. Contact us to discuss scheduling and pricing.</p></div>
      
        <div className={s.faqItem}><p className={s.faqQ}>Is this available online?</p><p className={s.faqA}>Yes. Sessions are conducted live online or in-person at our studio in Coimbatore. Both options are available. Students outside India join live online only.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>How flexible is the schedule?</p><p className={s.faqA}>Learning curve may vary per individual. We are flexible with additional individual practice time beyond the scheduled duration.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>What are the payment terms?</p><p className={s.faqA}>50% advance on booking, balance within 7 days of the invoice date. Payment via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</p></div>

      <hr className={s.divider} />
      <div className={s.ctaBottom}>
        <p className={s.ctaBottomText}>Interested in a workshop for your institution or team?</p>
        <a href="/courses#enquire" className={s.btnPrimary}>Get in touch</a>
      </div>
    </div>
      <CourseSidebarNav current="/courses/rhino3d-aec-climate" />
    </main>

      <Lightbox
        groups={[
          { key: 'rhino3d-aec-climate', title: 'Rhino3D for AEC & Climate', role: 'Course gallery', photos: GALLERY },
          { key: 'rhino3d-aec-climate-workflow', title: 'Ladybug and Honeybee workflow', role: 'Course gallery', photos: WORKFLOW },
        ]}
      />
      <SiteFooter />
    </>
  );
}
