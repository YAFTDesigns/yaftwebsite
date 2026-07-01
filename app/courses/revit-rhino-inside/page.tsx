import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import s from '../course.module.css';

export const metadata: Metadata = {
  title: 'Revit Architecture + Rhino.Inside | YAFT Designs',
  description: 'Re-Imagining BIM Design. 6-week comprehensive Revit Architecture course covering 10 modules from basics to collaboration, with Rhino.Inside.Revit integration.',
};

export default function RevitRhinoInside() {
  return (
    <>
      <SiteHeader active="/courses" />
      <main className={s.wrap}>
      <span className={s.tag}>BIM + Computational Design</span>
      <h1 className={s.headline}>Revit Architecture + Rhino.Inside</h1>
      <p className={s.subtitle}>Re-Imagining BIM Design Workshop</p>
      <p className={s.desc}>Industry-leading BIM implementation for architectural projects. From complete beginner to proficient use across 10 modules covering the full Revit workflow, documentation, and Rhino.Inside.Revit integration for computational design.</p>
      <div className={s.badges}>
        <span className={s.badge}>6 weeks / 60 hours</span>
        <span className={s.badge}>Beginner to proficient</span>
        <span className={s.badge}>Certificate</span>
        <span className={s.badge}>Live online / Coimbatore</span>
        <span className={s.badge}>Rhino.Inside included</span>
      </div>
      <div className={s.ctaBar}>
        <div>
          <div className={s.priceMain}>$480 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>group</span></div>
          <div className={s.priceSub}>INR 40,000 + GST</div>
          <div style={{marginTop:10,paddingTop:10,borderTop:'0.5px solid var(--line)'}}>
            <div className={s.priceMain}>$600 <span style={{fontSize:14,fontWeight:400,color:'var(--ink-soft)'}}>personal</span></div>
            <div className={s.priceSub}>INR 50,000 + GST</div>
          </div>
          <div className={s.priceUsd}>approx. rates · subject to change</div>
        </div>
        <div className={s.ctaBtns}>
          <a href="/courses#enquire" className={s.btnOutline}>Enquire now</a>
          <a href="https://rjvadqwqgqouihuydlnu.supabase.co/storage/v1/object/public/syllabus/Revit_Architecture_Rhino_Insider.pdf" className={s.btnPrimary}>Download syllabus</a>
        </div>
      </div>

      <p className={s.sectionLabel}>What you will learn</p>
      <div className={s.outcomesGrid}>
        {"Revit interface, shortcuts and basic setup,Wall, roof, ceiling, floor and stair creation,Families, components and parameters,Views, graphics and design phases,Documentation: title blocks, sheets and dimensions,Data: areas, rooms, schedules and legends,Model management and collaboration,Rhino.Inside.Revit integration".split(',').map(o => (
          <div key={o} className={s.outcomeItem}><span className={s.check}>✓</span><span>{o}</span></div>
        ))}
      </div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course schedule</p>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Week 1</span><span className={s.dayTitle}>Basics of Revit + complex walls and elements</span></div><div className={s.dayItem}>Interface, shortcuts, basic setup and geometry</div><div className={s.dayItem}>Wall creation, adding elements (windows, doors), roof, ceiling and floor</div><div className={s.dayItem}>Model overview, editing and hosting walls, curtain walls, element parameters</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Week 2</span><span className={s.dayTitle}>Circulation + families and components</span></div><div className={s.dayItem}>Stairs, ramps and openings: profiles, custom conditions, rails</div><div className={s.dayItem}>Understanding families and components, modeling forms, parameters, profiles and planes</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Week 3</span><span className={s.dayTitle}>Views and graphics + phases and design options</span></div><div className={s.dayItem}>Plan views, visibility and graphics overrides, view ranges, underlays and scale</div><div className={s.dayItem}>View templates, elevations, sections and 3D views</div><div className={s.dayItem}>Managing phases, phase filters and design options</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Week 4</span><span className={s.dayTitle}>Documentation + data</span></div><div className={s.dayItem}>Title blocks, sheets, view titles, drafting views, drawing callouts, dimensions, print and export</div><div className={s.dayItem}>Areas, rooms, boundaries, schedules, formulas, conditional statements and legend</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Week 5</span><span className={s.dayTitle}>Model management</span></div><div className={s.dayItem}>Explaining manage tab</div></div>
      <div className={s.dayCard}><div className={s.dayHeader}><span className={s.dayNum}>Week 6</span><span className={s.dayTitle}>Collaborations + Rhino.Inside.Revit</span></div><div className={s.dayItem}>Linking models, Copy/Monitor, central model vs detached models, worksets</div><div className={s.dayItem}>Rhino.Inside.Revit integration and computational design workflow</div></div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Course fees</p>
      <div className={s.feeBox}>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Group batch</div><div className={s.feeNote}>Rs. 750/hr • 3 days / 9 hrs per week • exclusive of taxes</div></div><div className={s.feeAmt}>INR 40,000 + GST<div className={s.feeUsd}>approx. $480</div></div></div>
        <div className={s.feeRow}><div><div className={s.feeLabel}>Personal training</div><div className={s.feeNote}>Rs. 1000/hr • exclusive of taxes</div></div><div className={s.feeAmt}>INR 50,000 + GST<div className={s.feeUsd}>approx. $600</div></div></div>
      </div>
      <div className={s.payNote}>Payment: 60% advance on booking, 40% on commencement. Via NEFT to YAFT Designs, Axis Bank, IFSC: UTIB0001293.</div>

      <hr className={s.divider} />
      <p className={s.sectionLabel}>Software requirements</p>
      <div className={s.reqItem}>Autodesk Revit (free 30-day trial available at autodesk.com/in/products/revit)</div>
      <div className={s.reqItem}>Rhino.Inside.Revit (free download at rhino3d.com/download/rhino.inside.revit/1/latest)</div>
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
      <div className={s.faqItem}><p className={s.faqQ}>Do I need prior BIM experience?</p><p className={s.faqA}>No. The course covers everything from the very basics up to proficient use. Complete beginners are welcome.</p></div>
      <div className={s.faqItem}><p className={s.faqQ}>What is Rhino.Inside.Revit?</p><p className={s.faqA}>Rhino.Inside.Revit lets you run Rhino and Grasshopper inside the Revit environment, enabling computational design and parametric modeling directly within your BIM workflow.</p></div>
      
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
