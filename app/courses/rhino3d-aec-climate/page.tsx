import type { Metadata } from 'next';
import s from '../course.module.css';

export const metadata: Metadata = {
  title: 'Rhino3D for AEC and Climate | YAFT Designs',
  description: 'A focused 2-day workshop on Rhino3D for AEC professionals with Grasshopper climatic analysis and facade optimization using Ladybug.',
};

export default function Rhino3DAEC() {
  return (
    <main className={s.wrap}>
      <span className={s.tag}>Authorized Rhino Training Center</span>
      <h1 className={s.headline}>Rhino3D for AEC + Climate</h1>
      <p className={s.subtitle}>A Design Re-Thinking Workshop</p>
      <p className={s.desc}>A focused workshop for AEC professionals covering Rhino3D fundamentals and Grasshopper-based climatic analysis and facade optimization. Learn to analyze building orientation and optimize facades with respect to radiation data using Ladybug.</p>
      <div className={s.badges}>
        <span className={s.badge}>2 days / 10 to 15 hours</span>
        <span className={s.badge}>AEC professionals</span>
        <span className={s.badge}>Live online / On-site</span>
        <span className={s.badge}>Ladybug included</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>INR 10,000 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>(6 hrs, 3+3 sessions)</span></div>
          <div className={s.priceSub}>Institutions: contact for custom pricing</div>
          <div className={s.priceUsd}>approx. $120 (USD)</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#enquire" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Rhino_3D_Training_for_AEC_for_Climate.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Rhino3D fundamentals for AEC workflows,Rhino object types, interface and curve modeling,Grasshopper for climatic analysis and optimisation,Facade design with climate data using Ladybug,Building orientation analysis and optimisation,Radiation analysis on super-structures".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 01</span><span className={s.dayTitle}>Introduction to Rhino3D for AEC</span></div><div className={s.dayItem}>Introduction to Rhino object types and interface</div><div className={s.dayItem}>Curve creation and modeling</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 02</span><span className={s.dayTitle}>Grasshopper: climatic analysis and optimisation</span></div><div className={s.dayItem}>Facade designing: building analysis with respect to climate data</div><div className={s.dayItem}>Optimising facade and orientation with respect to radiation received by the super-structure</div><div className={s.dayItem}>Case study: Al Bahar Towers</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Individual / group training</div><div className={s.feeNote}>6 hours total, split as 3+3 sessions • incl. all taxes</div></div><div className={s.feeAmt}>INR 10,000<div className={s.feeUsd}>approx. $120</div></div></div>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Institutions / colleges</div><div className={s.feeNote}>Custom pricing, travel expenses borne by institution</div></div><div className={s.feeAmt}>Contact us</div></div>
      </div>
      <div className={s.payNote}>Payment: 60% advance on booking, 40% on commencement. Via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</div>

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
      
        <div className={s.faqItem}><p className={s.faqQ}>Is this available online?</p><p className={s.faqA}>Yes. Sessions are conducted live online or in-person at our studio in Coimbatore. Both options are available.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>How flexible is the schedule?</p><p className={s.faqA}>Learning curve may vary per individual. We are flexible with additional individual practice time beyond the scheduled duration.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>What are the payment terms?</p><p className={s.faqA}>60% advance on booking, 40% on commencement of classes. Payment via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</p></div>

      <hr className={s.divider} />
      <div className={s.ctaBottom}>
        <p className={s.ctaBottomText}>Interested in a workshop for your institution or team?</p>
        <a href="/courses#enquire" className={s.btnPrimary}>Get in touch</a>
      </div>
    </main>
  );
}
