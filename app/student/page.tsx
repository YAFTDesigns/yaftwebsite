import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import StudentClient from './StudentClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Student portal', robots: { index: false, follow: false } };

export default function StudentPage() {
  return (
    <>
      <SiteHeader />
      <style>{`.sp-light{--paper:#F4F6F9;--paper-2:#FFFFFF;--ink:#111827;--ink-soft:#5B6472;--line:#E3E7ED;--blueprint:#0E8F84;--brass:#C62835;background:var(--paper);color:var(--ink)}.sp-light h1,.sp-light h2,.sp-light h3,.sp-light strong{color:var(--ink)}.sp-light a{color:var(--blueprint)}`}</style>
      <div className="sp-light" style={{ minHeight: '70vh', paddingTop: 72 }}>
        <StudentClient />
      </div>
      <SiteFooter />
    </>
  );
}
