import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TortoiseBuy from '@/components/TortoiseBuy';
import styles from './tortoise.module.css';

// Online purchase stays hidden until TORTOISE_CHECKOUT_ENABLED=1 is set in Vercel and the site is redeployed.
const CHECKOUT_ENABLED = process.env.TORTOISE_CHECKOUT_ENABLED === '1';

export const metadata: Metadata = {
  title: 'Tortoise for Rhino 8 | Auto-dimensioned Glass and Panel Sheets | YAFT Designs',
  description:
    'Tortoise is a Rhino 8 plugin that turns flat glass and panel surfaces into dimensioned A3 sheets with PDF, DWG/DXF and Excel BOM output. Free 60-day trial.',
  alternates: { canonical: '/tortoise' },
};

const DOES = [
  'One A3 layout per panel with automatic side dimensions, corner angles and side letters',
  'Curved outlines: arc length dimensions, radius notes and marked centres',
  'Editable fab A3 template with title block, revision log and tolerance row',
  'Glass, aluminium or other material, with DGU, TGU and SGU glass types',
  'Exports DWG/DXF per panel, per-panel and combined PDFs, and an Excel BOM',
];

export default function TortoisePage() {
  return (
    <>
      <SiteHeader active="/labs" />
      <main>
        <section className="page-hero">
          <div className="wrap">
            <p className="eyebrow">YAFT Designs &middot; Rhino plugin</p>
            <h1>Tortoise</h1>
            <p className="lede">
              Select your flat glass or panel surfaces in Rhino 8 and get one dimensioned A3 sheet per panel, plus PDFs, DWG/DXF and an Excel BOM.
            </p>
          </div>
        </section>

        <section className={`wrap ${styles.body}`}>
          <h2>What it does</h2>
          <ul className={styles.list}>
            {DOES.map((d) => <li key={d}>{d}</li>)}
          </ul>

          <h2>Free trial and licence</h2>
          <p>
            Tortoise is free to use for 60 days from first use, for personal and commercial work. After 60 days it keeps working but marks every sheet,
            PDF, DWG/DXF and BOM with TRIAL EXPIRED until a licence key is entered in Tortoise &gt; About / Help &gt; Licence. The key is checked online now and then,
            and the plugin works offline for up to 30 days between checks.
          </p>
          {CHECKOUT_ENABLED ? (
            <>
              <p>
                A licence is a one-time purchase per licence key, and it does not expire. Pay securely with Razorpay (cards, UPI, netbanking) and your key is emailed to you.
              </p>
              <TortoiseBuy />
              <p className={styles.small}>
                Prefer to pay another way, or need an invoice first? Email{' '}
                <a href="mailto:yaftdesigns@gmail.com?subject=Tortoise%20licence">yaftdesigns@gmail.com</a>.
              </p>
            </>
          ) : (
            <p>
              A licence is a one-time <strong>US$49</strong> per licence key, and it does not expire. To buy one, email{' '}
              <a href="mailto:yaftdesigns@gmail.com?subject=Tortoise%20licence">yaftdesigns@gmail.com</a> with your name, company and the number of PCs, and we will send payment details and your key.
            </p>
          )}

          <h2>Requirements</h2>
          <p>Rhino 8 for Windows. Mac is not supported yet. Excel is only needed to open the BOM, not to create it.</p>

          <h2>Feedback and support</h2>
          <p>
            Found a bug or want a feature? Email{' '}
            <a href="mailto:yaftdesigns@gmail.com?subject=Tortoise%20feedback">yaftdesigns@gmail.com</a> with a screenshot and, if you can, a small .3dm with a few sample panels.
          </p>
          <p className={styles.small}>Provided as is, with no warranty. Please keep a copy of your model before running.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
