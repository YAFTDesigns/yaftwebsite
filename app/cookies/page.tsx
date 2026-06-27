import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import styles from '../terms/terms.module.css';

export const metadata: Metadata = {
  title: 'Cookies Policy | YAFT Designs',
  description: 'How YAFT Designs uses cookies on yaftdesigns.com.',
  alternates: { canonical: 'https://yaftdesigns.com/cookies' },
};

const CLAUSES = [
  {
    title: 'What Are Cookies',
    body: 'Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences and understand how you use it. Cookies do not give us access to your device or any personal information beyond what you choose to share with us.',
  },
  {
    title: 'Cookies We Use',
    body: 'YAFT Designs uses a minimal set of cookies to keep the site functional and to understand how visitors use it. We do not use advertising cookies or sell any data to third parties.',
  },
  {
    title: 'Analytics Cookies (Google Analytics 4)',
    body: 'We use Google Analytics 4 to understand how visitors interact with yaftdesigns.com, including which pages are visited, how long visitors stay, and how they arrived at the site. This data is aggregated and anonymous. It helps us improve the site and our course offerings. Google Analytics sets cookies such as _ga and _ga_* on your device. These cookies persist for up to 2 years. You can opt out of Google Analytics tracking by installing the Google Analytics Opt-out Browser Add-on available at tools.google.com/dlpage/gaoptout.',
  },
  {
    title: 'Functional Cookies (Supabase)',
    body: 'If you access any authenticated area of the site, such as the admin dashboard, a session cookie is set by Supabase to keep you logged in. This cookie is strictly necessary for those features to function and is removed when you log out or close your browser session.',
  },
  {
    title: 'Syllabus Gate',
    body: 'When you unlock a course syllabus PDF by submitting your email or LinkedIn, we store a small flag in your browser\'s local storage to remember that you have already unlocked access. This is not a cookie but serves a similar purpose. It does not track you across other websites and is stored only on your device.',
  },
  {
    title: 'Third-Party Cookies',
    body: 'Some features of this site may load content from third-party services such as YouTube (for video embeds on the Resources page) and Google Fonts. These services may set their own cookies. YAFT Designs has no control over third-party cookies and recommends reviewing the privacy policies of those services independently.',
  },
  {
    title: 'Managing Cookies',
    body: 'You can control and delete cookies through your browser settings. Most browsers allow you to block cookies entirely, delete existing cookies, or be notified when a cookie is set. Note that disabling cookies may affect the functionality of some parts of this site. For guidance on managing cookies in your specific browser, visit the help section of your browser or allaboutcookies.org.',
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this cookies policy from time to time. Any changes will be published on this page with an updated date. Continued use of yaftdesigns.com after any update constitutes your acceptance of the revised policy.',
  },
  {
    title: 'Contact',
    body: 'If you have any questions about how we use cookies, please contact us at yaftdesigns@gmail.com. Studio: Coimbatore, Tamil Nadu, India.',
  },
];

export default function CookiesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className="wrap">
            <div className="eyebrow">LEGAL</div>
            <h1 className={styles.title}>Cookies Policy</h1>
            <p className={styles.updated}>Last updated: June 2026</p>
            <p className={styles.intro}>
              This policy explains what cookies are, which ones yaftdesigns.com uses, and how you can control them. For our broader data practices see our{' '}
              <a href="/terms" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>Terms</a>{' '}and{' '}
              <a href="/consent" style={{ color: 'var(--brass)', borderBottom: '1px solid var(--brass)' }}>Consent</a>{' '}pages.
            </p>
          </div>
        </section>

        <section className={styles.content}>
          <div className={styles.wrap}>
            {CLAUSES.map((clause, i) => (
              <div key={i} className={styles.clause}>
                <h2 className={styles.clauseTitle}>{clause.title}</h2>
                <p className={styles.clauseBody}>{clause.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
