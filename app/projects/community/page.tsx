import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import FeatureWall from '@/components/FeatureWall';
import { getStudentWork, getPublications, getPartners } from '@/lib/feature-wall';

export const metadata: Metadata = {
  title: 'YAFT Community Works',
  description: 'Student projects, publications, and partner studios built with YAFT Designs training and collaboration.',
  alternates: { canonical: '/projects/community' },
};

export const revalidate = 300;

export default async function CommunityPage() {
  const [studentWork, publications, partners] = await Promise.all([
    getStudentWork(),
    getPublications(),
    getPartners(),
  ]);

  return (
    <>
      <SiteHeader active="/projects" />
      <main>
        <div className="wrap">
          <FeatureWall studentWork={studentWork} publications={publications} partners={partners} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
