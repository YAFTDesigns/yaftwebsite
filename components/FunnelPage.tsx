import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ContactForm from '@/components/ContactForm';
import ServiceCta from '@/components/ServiceCta';
import { FUNNEL_CONFIG } from '@/lib/funnels';
import { FUNNEL_LABELS, type Funnel } from '@/lib/enquiryFields';

export function funnelMetadata(key: Funnel): Metadata {
  const c = FUNNEL_CONFIG[key];
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: c.path },
    openGraph: { title: `${c.title} | YAFT Designs`, description: c.description, url: `https://www.yaftdesigns.com${c.path}`, type: 'website', images: [{ url: 'https://www.yaftdesigns.com/assets/images/og-image.jpg' }] },
  };
}

export default function FunnelPage({ funnelKey }: { funnelKey: Funnel }) {
  const c = FUNNEL_CONFIG[funnelKey];
  return (
    <>
      <SiteHeader active={c.path} />
      <main id="top">
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">{c.eyebrow}</div>
            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 700, letterSpacing: '-0.02em' }}>{c.heading}</h1>
            <p className="lede">{c.lede}</p>
            <ServiceCta service={`funnel_${c.key}`} cta="hero" interest={c.options[0]} segment={c.segment} label={c.cta} />
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head"><h2>What we offer</h2></div>
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {c.points.map((p) => (
                <div key={p.title}>
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: 18, marginBottom: 8 }}>{p.title}</h3>
                  <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6 }}>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head"><h2>How it works</h2></div>
            <ol style={{ paddingLeft: 20, lineHeight: 1.9, color: 'var(--ink-soft)', maxWidth: 680 }}>
              {c.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', marginTop: 16 }}>
              See the <a href="/terms" style={{ textDecoration: 'underline' }}>Terms</a> for the cancellation and refund policy.
            </p>
          </div>
        </section>

        <section id="contact">
          <div className="wrap">
            <div className="eyebrow">CONTACT</div>
            <div className="section-head"><h2>{c.formHeading}</h2></div>
            <div className="contact-grid">
              <ContactForm options={c.options} funnel={c.key} messagePlaceholder={c.messagePlaceholder} />
              <dl className="contact-info">
                <dt>Studio</dt>
                <dd>Coimbatore, Tamil Nadu, India</dd>
                <dt>Email</dt>
                <dd><a href="mailto:yaftdesigns@gmail.com">yaftdesigns@gmail.com</a></dd>
                <dt>Looking for something else?</dt>
                <dd>
                  {c.crossLinks.map((k, i) => (
                    <span key={k}>{i > 0 && ' · '}<a href={FUNNEL_CONFIG[k].path}>{FUNNEL_LABELS[k]}</a></span>
                  ))}
                </dd>
              </dl>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
