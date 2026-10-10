import type { Metadata } from 'next';
import Image from 'next/image';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TortoiseBuy from '@/components/TortoiseBuy';
import { priceFor, formatMinor, TORTOISE_USD_CENTS } from '@/lib/tortoisePricing';
import styles from './tortoise.module.css';

// Online purchase stays hidden until TORTOISE_CHECKOUT_ENABLED=1 is set in Vercel and the site is redeployed.
const CHECKOUT_ENABLED = process.env.TORTOISE_CHECKOUT_ENABLED === '1';

const VERSION = '1.0.3';
const DOWNLOAD_URL = `/downloads/Tortoise_v${VERSION}_Free.zip`;
const DOWNLOAD_SIZE = '187 KB';

export const metadata: Metadata = {
  title: 'Tortoise for Rhino 8 | Auto-dimensioned Glass and Panel Sheets | YAFT Designs',
  description:
    'Tortoise is a Rhino 8 plugin that turns flat glass and panel surfaces into dimensioned A3 sheets with PDF, DWG/DXF and Excel BOM output. Free 60-day trial, one-time licence.',
  alternates: { canonical: '/tortoise' },
  openGraph: {
    title: 'Tortoise for Rhino 8',
    description: 'One dimensioned A3 sheet per glass or panel surface, with PDF, DWG/DXF and Excel BOM. Free 60-day trial.',
    url: '/tortoise',
  },
};

const HERO_IMAGE = { src: '/assets/images/tortoise/tortoise-walkthrough.gif', w: 1000, h: 684, alt: 'Tortoise walkthrough: pick material and glass types, select panels, run, review the layouts and export' };

const SCREENSHOTS = [
  { src: '/assets/images/tortoise/tortoise-sheet.png', alt: 'A Tortoise A3 sheet for a glass panel with side dimensions, corner angles, side letters, DIM A to I table and title block', caption: 'One dimensioned A3 sheet per panel: side letters, dimensions, corner angles, DIM table and title block.', w: 1800, h: 1273, unopt: false },
  { src: '/assets/images/tortoise/tortoise-run-review.png', alt: 'Tortoise review list showing four panels with sizes, glass types and layout names, and a layout preview', caption: 'Run once and review every layout, size and glass type before you export.', w: 1100, h: 752, unopt: false },
  { src: '/assets/images/tortoise/tortoise-sheets.gif', alt: 'Four Tortoise sheets for panels of different sizes', caption: 'Panels of different sizes, each on its own sheet.', w: 1400, h: 990, unopt: true },
];

const FEATURES = [
  { t: 'Auto dimensions', d: 'Side lengths, overall width and height, corner angles and side letters A, B, C clockwise from the top-left corner. Tilted panels are turned square to the sheet, so sizes are true.' },
  { t: 'Curved outlines', d: 'Arc length dimensions that follow the arc, radius notes R1, R2, marked centres and the lengths in the DIM A-I cells. Shallow arcs stay arcs.' },
  { t: 'Fab A3 template', d: 'Title block, revision log (A, B, C), tolerance row and your own PNG or JPG logo. It is a normal Rhino layout, so you can edit it, and %TOKENS% fill in on every sheet.' },
  { t: 'Glass, aluminium or other', d: 'Each material keeps its own spec and tolerances. Glass types DGU, TGU and SGU with thickness (for example 6+12+6) are set per sheet in the review list.' },
  { t: 'Review before you export', d: 'Drag the review list to reorder sheets and the sheet and drawing numbers follow. Duplicate, missing, non-planar and invalid panels are caught before any sheet is made.' },
  { t: 'Built for big jobs', d: 'One bad panel never stops the run. Combined PDFs are split in parts of 100 pages for speed and memory, and your settings are saved inside the .3dm.' },
];

const OUTPUTS = [
  { t: 'DWG / DXF', d: 'One file per panel, ready for the shop or your CNC and fabrication partners.' },
  { t: 'PDF', d: 'One PDF per panel, and a combined binder PDF in sheet order.' },
  { t: 'Excel BOM', d: 'Spec, glass type, sizes, areas and quantities, with R1, R2 columns and a "Radius on side" column for curved panels.' },
];

const STEPS = [
  { t: 'Tag your panels', d: 'Add a user text key ID to every panel surface (for example G-101). Optionally add SPEC with DGU, TGU or SGU.' },
  { t: 'Set the template once', d: 'Make the Fab A3 template, add your logo, material, title block fields and tolerances. Apply it to all sheets.' },
  { t: 'Select and review', d: 'Select the surfaces, pick the scale (Auto or 1:n) and check the review list for glass types and order.' },
  { t: 'Export', d: 'Get the DWG/DXF, PDFs and Excel BOM in one run, with clean file names.' },
];

const FAQ = [
  { q: 'How does the free trial work?', a: 'Tortoise is free for 60 days from first use, for personal and commercial work, with every feature on. After 60 days it keeps working but marks every sheet, PDF, DWG/DXF and BOM with TRIAL EXPIRED until you enter a licence key in Tortoise > About / Help > Licence.' },
  { q: 'Do I need to be online?', a: 'The licence key is checked online now and then. Between checks, Tortoise works offline for up to 30 days.' },
  { q: 'How many PCs does one key cover?', a: 'Each key works on up to 2 PCs. A licence is a one-time purchase per key and does not expire. Need to move a key to a new PC? Email us.' },
  { q: 'Which panels work?', a: 'Single flat (planar) surfaces, one surface per panel, in any position or rotation. Curved outlines on a flat panel are supported. Holes and cutouts are not drawn or dimensioned yet.' },
  { q: 'What do I need?', a: 'Rhino 8 for Windows. Mac is not supported yet. Excel is only needed to open the BOM, not to create it.' },
  { q: 'Rhino says the plugin will not load.', a: 'Right-click the downloaded zip, choose Properties and tick Unblock before you unzip. Keep Tortoise.rhp together with its two .json files, and make sure you are on Rhino 8.' },
];

const CHANGELOG = [
  { v: 'v1.0.3', date: '9 Oct 2026', items: ['Curved outlines: arc length dims, radius notes, marked centres and edge letters', 'BOM R1, R2 columns and a "Radius on side" column', 'Own logo in the title block, Keys tab, Help / About with Copy diagnostics', 'Faster, lighter PDF export (combined PDF in parts of 100 pages)', 'Catches duplicate, missing, non-planar and invalid panels before sheets are made'] },
  { v: 'v1.0.1', date: '8 Oct 2026', items: ['Tilted panels are squared to the sheet so sizes, dimensions and side letters are true', 'Straight nurbs edges (unrolled, lofted or rebuilt surfaces) get full side dimensions and corner angles'] },
  { v: 'v1.0.0', date: '8 Oct 2026', items: ['First release: A3 layout per panel, Fab A3 template, glass types, review list, DWG/DXF, PDF and Excel BOM'] },
];

export default function TortoisePage() {
  const inr = priceFor('INR', 1);
  const usd = TORTOISE_USD_CENTS;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tortoise for Rhino',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Windows (Rhino 8)',
    softwareVersion: VERSION,
    description: 'Rhino 8 plugin that creates one dimensioned A3 sheet per glass or panel surface, with PDF, DWG/DXF and Excel BOM output.',
    url: 'https://www.yaftdesigns.com/tortoise',
    publisher: { '@type': 'Organization', name: 'YAFT Designs', url: 'https://www.yaftdesigns.com' },
    offers: [
      { '@type': 'Offer', price: String(usd / 100), priceCurrency: 'USD', description: 'One-time licence per key, up to 2 PCs' },
      { '@type': 'Offer', price: String(inr.base / 100), priceCurrency: 'INR', description: 'One-time licence per key before 18% GST, up to 2 PCs' },
    ],
  };

  return (
    <>
      <SiteHeader active="/labs" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className={styles.page}>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={`wrap ${styles.heroGrid}`}>
            <div>
              <div className={styles.logos}>
                <Image src="/assets/logos/yaft-square-logo.png" alt="YAFT Designs" width={44} height={44} />
                <span className={styles.x}>+</span>
                <Image src="/assets/logos/rhino-logo.png" alt="Rhinoceros 8" width={44} height={44} />
              </div>
              <p className="eyebrow">YAFT Designs &middot; Plugin for Rhino 8</p>
              <h1>Tortoise</h1>
              <p className={styles.lede}>
                Select your flat glass or panel surfaces and get one dimensioned A3 sheet per panel, plus DWG/DXF, PDFs and an Excel BOM, in one run.
              </p>
              <div className={styles.cta}>
                <a className="btn-primary" href={DOWNLOAD_URL} download>Download free trial</a>
                <a className="btn-secondary" href="#buy">Buy a licence</a>
              </div>
              <ul className={styles.facts}>
                <li>Rhino 8 for Windows</li>
                <li>v{VERSION}</li>
                <li>60-day free trial</li>
                <li>One-time licence, no subscription</li>
              </ul>
            </div>
            <figure className={styles.sheet}>
              <Image src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} width={HERO_IMAGE.w} height={HERO_IMAGE.h} unoptimized priority sizes="(max-width: 960px) 100vw, 600px" />
              <figcaption>The Tortoise window, step by step.</figcaption>
            </figure>
          </div>
        </section>

        {/* SCREENSHOTS */}
        <section className={`wrap ${styles.section}`}>
          <p className="eyebrow">See it work</p>
          <h2>Real sheets, straight from Rhino</h2>
          <div className={styles.gallery}>
            {SCREENSHOTS.map((s, i) => (
              <figure key={s.src} className={i === 0 ? styles.wide : undefined}>
                <Image src={s.src} alt={s.alt} width={s.w} height={s.h} unoptimized={s.unopt} sizes={i === 0 ? '(max-width: 1180px) 100vw, 1116px' : '(max-width: 800px) 100vw, 550px'} />
                <figcaption>{s.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className={`wrap ${styles.section}`}>
          <p className="eyebrow">What it does</p>
          <h2>From a flat surface to a fabrication sheet</h2>
          <div className={styles.grid}>
            {FEATURES.map((f) => (
              <article key={f.t} className={styles.card}>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className={styles.band}>
          <div className={`wrap ${styles.section}`}>
            <p className="eyebrow">How it works</p>
            <h2>Four steps</h2>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <span className={styles.num}>{i + 1}</span>
                  <div><h3>{s.t}</h3><p>{s.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* OUTPUTS */}
        <section className={`wrap ${styles.section}`}>
          <p className="eyebrow">What you get</p>
          <h2>Three outputs, one run</h2>
          <div className={styles.grid3}>
            {OUTPUTS.map((o) => (
              <article key={o.t} className={styles.card}>
                <h3>{o.t}</h3>
                <p>{o.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* DOWNLOAD */}
        <section id="download" className={styles.band}>
          <div className={`wrap ${styles.section}`}>
            <p className="eyebrow">Free trial</p>
            <h2>Download Tortoise and try it on your own panels</h2>
            <div className={styles.dl}>
              <div className={styles.dlCard}>
                <p className={styles.dlName}>Tortoise v{VERSION} Free</p>
                <p className={styles.dlMeta}>Windows &middot; Rhino 8 &middot; {DOWNLOAD_SIZE} zip &middot; 9 Oct 2026</p>
                <a className="btn-primary" href={DOWNLOAD_URL} download>Download free trial (.zip)</a>
                <p className={styles.small}>Every feature for 60 days, personal and commercial work. After that sheets are marked TRIAL EXPIRED until you enter a licence key. The free edition has no built-in logos, add your own PNG or JPG.</p>
              </div>
              <ol className={styles.install}>
                <li><strong>Unblock the zip.</strong> Right-click it, Properties, tick Unblock, OK. Otherwise Rhino may refuse to load the plugin.</li>
                <li><strong>Unzip</strong> to a folder you will keep, for example C:\Tools\Tortoise\. Keep Tortoise.rhp together with its two .json files.</li>
                <li><strong>Install in Rhino 8.</strong> Tools &gt; Options &gt; Plug-ins &gt; Install, pick Tortoise.rhp. Restart Rhino.</li>
                <li><strong>Run it.</strong> Type <code>Tortoise</code> on the command line. The README in the zip walks through a first run.</li>
              </ol>
            </div>
            <details className={styles.changelog}>
              <summary>What is new (changelog)</summary>
              {CHANGELOG.map((c) => (
                <div key={c.v}>
                  <h4>{c.v} <span>{c.date}</span></h4>
                  <ul>{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              ))}
            </details>
          </div>
        </section>

        {/* BUY */}
        <section id="buy" className={`wrap ${styles.section}`}>
          <p className="eyebrow">Licence</p>
          <h2>Buy a licence</h2>
          <div className={styles.price}>
            <div>
              <p className={styles.amt}>{formatMinor(inr.total, 'INR')}</p>
              <p className={styles.amtNote}>India, per key: {formatMinor(inr.base, 'INR')} + GST 18% {formatMinor(inr.gst, 'INR')}</p>
            </div>
            <div>
              <p className={styles.amt}>{formatMinor(usd, 'USD')}</p>
              <p className={styles.amtNote}>International, per key</p>
            </div>
            <ul className={styles.perks}>
              <li>One-time purchase, never expires</li>
              <li>Up to 2 PCs per key</li>
              <li>Key and tax invoice emailed to you</li>
              <li>Secure payment with Razorpay (cards, UPI, netbanking)</li>
            </ul>
          </div>
          {CHECKOUT_ENABLED ? (
            <>
              <TortoiseBuy />
              <p className={styles.small}>
                Prefer another way to pay, or need an invoice first? Email{' '}
                <a href="mailto:yaftdesigns@gmail.com?subject=Tortoise%20licence">yaftdesigns@gmail.com</a>.
              </p>
            </>
          ) : (
            <p className={styles.plain}>
              To buy, email <a href="mailto:yaftdesigns@gmail.com?subject=Tortoise%20licence">yaftdesigns@gmail.com</a> with your name, company and the number of PCs, and we will send payment details and your key.
            </p>
          )}
        </section>

        {/* FAQ */}
        <section className={styles.band}>
          <div className={`wrap ${styles.section}`}>
            <p className="eyebrow">Questions</p>
            <h2>Good to know</h2>
            <div className={styles.faq}>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT / SUPPORT */}
        <section className={`wrap ${styles.section} ${styles.about}`}>
          <Image src="/assets/logos/art-badge.png" alt="Authorized Rhino Trainer" width={72} height={72} />
          <div>
            <h2>Made by YAFT Designs</h2>
            <p>
              Tortoise comes out of live facade panel work: rationalising, unrolling and documenting glass and panels on real projects. YAFT Designs is an Authorized Rhino Training Center, recognized by McNeel &amp; Associates.
            </p>
            <p>
              Found a bug or want a feature? Email{' '}
              <a href="mailto:yaftdesigns@gmail.com?subject=Tortoise%20feedback">yaftdesigns@gmail.com</a> with a screenshot and, if you can, a small .3dm with a few sample panels.
            </p>
            <p className={styles.small}>Provided as is, with no warranty. Please keep a copy of your model before running.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
