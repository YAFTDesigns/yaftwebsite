import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Institutional sections for /colleges. Every claim here is already on the live site
// (faculty page, courses, workshop archive). Past institutions come straight from the
// admin-managed workshops table, so they stay in sync with /services and cannot drift.

const AUDIENCES = ['architecture colleges', 'design schools', 'M.Arch programs', 'B.Arch programs', 'B.Des programs', 'BIM and computational design programs', 'faculty development programs'];

const TOPICS = [
  { t: 'Rhino3D for Architecture', d: 'NURBS modelling through architectural geometry.' },
  { t: 'Grasshopper computational design', d: 'Parametric logic and computational workflows.' },
  { t: 'Rhino.Inside.Revit', d: 'Connecting computational design to BIM.' },
  { t: 'Parametric facade design', d: 'Panel rationalization and fabrication-oriented geometry.' },
  { t: 'Environmental analysis with Ladybug', d: 'Climate-responsive design and performance-driven form.' },
  { t: 'Digital fabrication and robotics', d: 'Including KUKA robotics integration with Rhino and Grasshopper.' },
  { t: '3D printing', d: 'Including metal 3D printing workflows.' },
  { t: 'Wearables, footwear and product design', d: 'Rhino3D for product and industrial design.' },
];

const FORMATS = [
  { t: 'Multi-day workshop', d: 'A focused hands-on program. As a reference, our Rhino3D for Architecture course runs 30 hours over 5 days.' },
  { t: 'Semester or elective module', d: 'Delivered as part of a term, as at CAT Trivandrum (elective) and ASADI (M.Arch coursework).' },
  { t: 'Visiting faculty engagement', d: 'An ongoing role inside a curriculum track, as at VIT Vellore.' },
  { t: 'Custom program', d: 'Shaped to your syllabus, student year, skill level, software and duration.' },
];

const WHY = [
  'Authorized Rhino Training Center, recognized by McNeel & Associates.',
  'Taught by a visiting faculty member (M.Arch, VIT V-SPARC) who works on live facade and BIM automation projects.',
  'Fabrication-oriented teaching drawn from real panel rationalization and documentation work.',
  '500+ students trained, with workshops at 5+ colleges.',
];

const h3 = { fontFamily: 'var(--display)', fontSize: 18, marginBottom: 8 } as const;
const soft = { color: 'var(--ink-soft)', lineHeight: 1.6 } as const;
const grid = { display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } as const;

export default async function CollegeSections() {
  let past: { key: string; place: string; title: string; role: string; description: string }[] = [];
  try {
    const { data, error } = await getSupabaseAdmin().from('workshops').select('key, place, title, role, description').eq('active', true).order('display_order');
    if (error) console.error('[colleges] workshops query failed:', error.message);
    past = data ?? [];
  } catch (err) {
    console.error('[colleges] workshops query threw:', err);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Computational design workshops for architecture and design institutions',
    serviceType: 'Rhino3D, Grasshopper and computational design training',
    provider: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
    areaServed: 'India',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    url: 'https://www.yaftdesigns.com/colleges',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <div className="wrap">
          <div className="section-head"><h2>Who this is for</h2></div>
          <p style={{ ...soft, maxWidth: 680 }}>Programs can be designed for {AUDIENCES.join(', ').replace(/, ([^,]*)$/, ' and $1')}.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head"><h2>Training topics</h2></div>
          <div style={grid}>
            {TOPICS.map((x) => (
              <div key={x.t}><h3 style={h3}>{x.t}</h3><p style={soft}>{x.d}</p></div>
            ))}
          </div>
          <p style={{ ...soft, marginTop: 20, fontFamily: 'var(--mono)', fontSize: 12 }}>
            Course details: <Link href="/courses" style={{ textDecoration: 'underline' }}>see all courses</Link>
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head"><h2>Delivery formats</h2></div>
          <div style={grid}>
            {FORMATS.map((x) => (
              <div key={x.t}><h3 style={h3}>{x.t}</h3><p style={soft}>{x.d}</p></div>
            ))}
          </div>
          <p style={{ ...soft, marginTop: 20, maxWidth: 680 }}>On campus or online. Duration, dates and fee are agreed with you in a proposal.</p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head"><h2>Why YAFT</h2></div>
          <ul style={{ ...soft, paddingLeft: 20, maxWidth: 720 }}>
            {WHY.map((w) => <li key={w}>{w}</li>)}
          </ul>
          <p style={{ marginTop: 16, fontFamily: 'var(--mono)', fontSize: 12 }}>
            <Link href="/faculty" style={{ textDecoration: 'underline' }}>Meet the faculty</Link>
          </p>
        </div>
      </section>

      {past.length > 0 && (
        <section id="past-workshops">
          <div className="wrap">
            <div className="section-head"><h2>Past workshops and institutions</h2></div>
            <div style={grid}>
              {past.map((w) => (
                <div key={w.key}>
                  <h3 style={h3}>{w.title}</h3>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 6 }}>{w.role}</p>
                  <p style={soft}>{w.description}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 20, fontFamily: 'var(--mono)', fontSize: 12 }}>
              <Link href="/services#workshops" style={{ textDecoration: 'underline' }}>See workshop photos</Link>
            </p>
          </div>
        </section>
      )}

      <section>
        <div className="wrap">
          <div className="section-head"><h2>Custom programs</h2></div>
          <p style={{ ...soft, maxWidth: 680 }}>
            Every program is shaped around your student year, syllabus, skill level, preferred software, duration and academic objective. Tell us what you need in the form below.
          </p>
        </div>
      </section>
    </>
  );
}
