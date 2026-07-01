import type { Metadata } from 'next';
import s from '../course.module.css';

export const metadata: Metadata = {
  title: 'Grasshopper for Architecture | YAFT Designs',
  description: 'Re-Imagining Parametric Design. 6-day live Grasshopper workshop covering data trees, attractors, surface mapping, and plugins like Ladybug, Kangaroo, and Galapagos.',
};

export default function GrasshopperArchitecture() {
  return (
    <main className={s.wrap}>
      <span className={s.tag}>Authorized Rhino Training Center</span>
      <h1 className={s.headline}>Grasshopper for Architecture</h1>
      <p className={s.subtitle}>Re-Imagining Parametric Design Workshop</p>
      <p className={s.desc}>Grasshopper is a visual programming platform that lets you Generate, Manipulate and automate data. Participants are guided in developing skills on computational design and parametric approaches that lead to form finding and optimization through various parameters.</p>
      <div className={s.badges}>
        <span className={s.badge}>6 days / 36 hours</span>
        <span className={s.badge}>Intermediate to advanced</span>
        <span className={s.badge}>Certificate</span>
        <span className={s.badge}>Live online / Coimbatore</span>
        <span className={s.badge}>Plugins included</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>INR 30,000 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}> + GST group</span></div>
          <div className={s.priceSub}>INR 35,000 + GST for personal training</div>
          <div className={s.priceUsd}>approx. $360 group / $420 personal (USD)</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#enquire" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Grasshopper_Training_for_Architecture.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Competence of Grasshopper in Architecture,Native Grasshopper tools and Panelling tools plugin,Grasshopper and its relation to Rhino3D,Logics and data management in Grasshopper,Geometric pattern generation for facades,Attractor logics and data dynamic remapping,Surface mapping and morphing techniques,Plugins: Ladybug, Lunchbox, Open Nest, Galapagos".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 01</span><span className={s.dayTitle}>Introduction to Grasshopper and parametric thinking</span></div><div className={s.dayItem}>Understanding Grasshopper and its relation to Rhino3D</div><div className={s.dayItem}>Number sequences</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 02</span><span className={s.dayTitle}>Introduction to data trees and data management</span></div><div className={s.dayItem}>List management</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 03</span><span className={s.dayTitle}>Tree management</span></div><div className={s.dayItem}>Attractor logics</div><div className={s.dayItem}>Data dynamic remapping</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 04</span><span className={s.dayTitle}>Understanding surfaces</span></div><div className={s.dayItem}>Surface creations</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 05</span><span className={s.dayTitle}>Surface mapping and Isotrim</span></div><div className={s.dayItem}>Morphing techniques</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Day 06</span><span className={s.dayTitle}>Plugins and analysis</span></div><div className={s.dayItem}>Visualising data</div><div className={s.dayItem}>Open Nest, Lunchbox, Ladybug, Galopagus (colors and gradients)</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Group batch</div><div className={s.feeNote}>10% discount for students • exclusive of taxes</div></div><div className={s.feeAmt}>INR 30,000 + GST<div className={s.feeUsd}>approx. $360</div></div></div>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Personal training</div><div className={s.feeNote}>exclusive of taxes</div></div><div className={s.feeAmt}>INR 35,000 + GST<div className={s.feeUsd}>approx. $420</div></div></div>
      </div>
      <div className={s.payNote}>Payment: 60% advance on booking, 40% on commencement. Via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Prerequisites</p>
      <div className={s.reqItem}>Basic knowledge of Rhino3D recommended. Completion of Rhino3D for Architecture course at YAFT Designs is ideal.</div>
      <div className={s.reqItem}>Windows OS preferred. Laptop + charger + mouse and mouse pad mandatory.</div>

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
      <div className={s.faqItem}><p className={s.faqQ}>Do I need to know Rhino3D first?</p><p className={s.faqA}>Basic Rhino3D knowledge is recommended. If you are new to Rhino, we suggest completing the Rhino3D for Architecture course first.</p></div>
      
        <div className={s.faqItem}><p className={s.faqQ}>Is this available online?</p><p className={s.faqA}>Yes. Sessions are conducted live online or in-person at our studio in Coimbatore. Both options are available.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>How flexible is the schedule?</p><p className={s.faqA}>Learning curve may vary per individual. We are flexible with additional individual practice time beyond the scheduled duration.</p></div>
        <div className={s.faqItem}><p className={s.faqQ}>What are the payment terms?</p><p className={s.faqA}>60% advance on booking, 40% on commencement of classes. Payment via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</p></div>

      <hr className={s.divider} />
      <div className={s.ctaBottom}>
        <p className={s.ctaBottomText}>Ready to start? Reach out and we will schedule a free intro call.</p>
        <a href="/courses#enquire" className={s.btnPrimary}>Enquire now</a>
      </div>
    </main>
  );
}
