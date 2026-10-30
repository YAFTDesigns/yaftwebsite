import type { Metadata } from 'next';
import { loadCatalog } from '@/lib/courseCatalog';
import { getInrPerUsd, fxBufferPercent } from '@/lib/fx';
import EnrollClient from './EnrollClient';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

import { CONTACT_EMAIL } from '@/lib/contact';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Enrol',
  description: 'Choose your Rhino and Grasshopper courses, see the fee, and enrol online.',
  alternates: { canonical: '/enroll' },
};

export default async function EnrollPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const enabled = process.env.COURSE_CHECKOUT_ENABLED === '1';
  const [items, q] = enabled ? await Promise.all([loadCatalog(), getInrPerUsd()]) : [[], null];
  return (
    <>
    <SiteHeader active="/courses" />
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '120px 20px 96px', color: 'var(--ink)' }}>
      <a href="/courses" style={{ fontSize: 14, textDecoration: 'underline', display: 'inline-block', marginBottom: 16 }}>← Back to courses</a>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Enrol in a course</h1>
      <p style={{ opacity: 0.8, marginBottom: 28 }}>Pick your course or a combo, pay half now or everything at once. You get a tax invoice by email after each payment.</p>
      {!enabled || items.length === 0 ? (
        <p>Online enrolment is opening soon. For now, please <a href={`mailto:${CONTACT_EMAIL}?subject=Course%20enrolment`} style={{ textDecoration: 'underline' }}>email us</a> and we will set it up.</p>
      ) : (
        <EnrollClient items={items} fx={q ? { inrPerUsd: q.inrPerUsd, bufferPercent: fxBufferPercent() } : null} preselect={course} />
      )}
      <section style={{ marginTop: 48, fontSize: 14, opacity: 0.85 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Corporate / team training</h2>
        <p>Looking for training for your team? Email us to discuss a personalised course, flexible schedules, and pricing tailored to your organisation.{' '}
          <a href={`mailto:${CONTACT_EMAIL}?subject=Corporate%20Training%20Enquiry`} style={{ textDecoration: 'underline' }}>Email us for personalised training</a>.</p>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
