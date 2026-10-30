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
      <div style={{ minHeight: '70vh', paddingTop: 72 }}>
        <StudentClient />
      </div>
      <SiteFooter />
    </>
  );
}
