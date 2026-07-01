import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import s from '../course.module.css';

export const metadata: Metadata = {
  title: 'Rhino3D for Architecture | YAFT Designs',
  description: 'Master NURBS modeling, surface design and computational geometry in Rhino3D. 5-day live workshop for architects and designers. Authorized Rhino Training Center.',
};

export default function Rhino3DArchitecture() {
  return (
    <>
      <SiteHeader active="/courses" />
      <main className={s.wrap}>
      <span className={s.tag}>Authorized Rhino Training Center</span>
      <h1 className={s.headline}>Rhino3D for Architecture</h1>
      <p className={s.subtitle}>A Design Re-Thinking Workshop</p>
      <p className={s.desc}>Explore design challenges and learn to Design, Construct, Model, Analyze, present and realize architectural ideas in Rhino3D. From basic object types to advanced surface modeling and 3D printing, this workshop builds intuitive modeling skills in a logical, computational way.</p>
      <div className={s.badges}>
        <span className={s.badge}>5 days / 30 hours</span>
        <span className={s.badge}>Basic to advanced</span>
        <span className={s.badge}>Certificate</span>
        <span className={s.badge}>Live online / Coimbatore</span>
        <span className={s.badge}>3D printing included</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>$276 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>group</span></div>
          <div className={s.priceSub}>INR 23,000 (incl. taxes)</div>
          <div style={{marginTop:10,paddingTop:10,borderTop:'0.5px solid var(--line)'}}>
            <div className={s.priceMain}>$300 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>personal</span></div>
            <div className={s.priceSub}>INR 25,000 + GST</div>
          </div>
          <div className={s.priceUsd}>approx. rates · subject to change</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#enquire" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Rhino_3D_Training_for_Architecture.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Rhino3D competence for architecture design,Principles of various modeling approaches,Basic and advanced model recreation,Interoperability with other software and plugins,New design methods and workflows,3D printing from Rhino models,Panelling tools plugin,Introduction to parametric design".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 01</span><span className={s.dayTitle}>Introduction to Rhino3D for Architecture</span></div><div className={s.dayItem}>Introduction to Rhino object types and interface</div><div className={s.dayItem}>Curve creation and editing</div><div className={s.dayItem}>From ideas and diagrams to a complete 3D model</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 02</span><span className={s.dayTitle}>From ideas to complete 3D model</span></div><div className={s.dayItem}>Curve editing and precision modelling</div><div className={s.dayItem}>Conceptual models to detailed geometry</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 03</span><span className={s.dayTitle}>Form-based strategies</span></div><div className={s.dayItem}>Solid modelling: creation, editing and Boolean operations</div><div className={s.dayItem}>Introduction to parametric design</div><div className={s.dayItem}>Re-creating Absolute Towers (MAD Architects)</div><div className={s.dayItem}>Re-creating Peoples Building (BIG Architects)</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 04</span><span className={s.dayTitle}>Understanding complex surfaces</span></div><div className={s.dayItem}>Surface modelling: creation and editing</div><div className={s.dayItem}>SubD modelling</div><div className={s.dayItem}>Recreating complex surfaces from iconic architectural projects</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 05</span><span className={s.dayTitle}>Master class and output</span></div><div className={s.dayItem}>Master class: surface modelling</div><div className={s.dayItem}>Layouts, importing and exporting</div><div className={s.dayItem}>Prototyping in 3D printing</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Group batch</div><div className={s.feeNote}>10% discount for students • incl. all taxes</div></div><div className={s.feeAmt}>INR 23,000<div className={s.feeUsd}>approx. $276</div></div></div>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Personal training</div><div className={s.feeNote}>exclusive of taxes</div></div><div className={s.feeAmt}>INR 25,000 + GST<div className={s.feeUsd}>approx. $300</div></div></div>
      </div>
      <div className={s.payNote}>Payment: 60% advance on booking, 40% on commencement. Via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</div>

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
      <div className={s.faqItem}><p className={s.faqQ}>Do I need prior Rhino experience?</p><p className={s.faqA}>No. The course starts from object types and interface basics. SketchUp and AutoCAD users can join without any prior Rhino experience.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>Will this help me learn Grasshopper later?</p><p className={s.faqA}>Absolutely. Rhino3D is the foundation for Grasshopper. This course gives you a strong head start for the Grasshopper for Architecture course at YAFT Designs.</p></div>
      
        <div className={s.faqItem}><p className={s.faqQ}>Is this available online?</p><p className={s.faqA}>Yes. Sessions are conducted live online or in-person at our studio in Coimbatore. Both options are available.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>How flexible is the schedule?</p><p className={s.faqA}>Learning curve may vary per individual. We are flexible with additional individual practice time beyond the scheduled duration.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>What are the payment terms?</p><p className={s.faqA}>60% advance on booking, 40% on commencement of classes. Payment via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</p></div>

      <hr className={s.divider} />
      <div className={s.ctaBottom}>
        <p className={s.ctaBottomText}>Ready to start? Reach out and we will schedule a free intro call.</p>
        <a href="/courses#enquire" className={s.btnPrimary}>Enquire now</a>
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
