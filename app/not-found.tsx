import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero" style={{ textAlign: 'center', paddingBottom: 80 }}>
          <div className="wrap">
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--brass)', letterSpacing: '0.05em' }}>404</span>
            <h1 style={{ marginTop: 12 }}>This page doesn&apos;t exist.</h1>
            <p className="lede" style={{ margin: '0 auto 32px' }}>
              The page you&apos;re looking for may have moved, been renamed, or never existed. Here are a few places to go instead.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-primary">Go home</Link>
              <Link href="/courses" className="btn-secondary">Browse courses</Link>
              <Link href="/insights" className="btn-secondary">Read insights</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
