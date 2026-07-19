import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CertificateVerify from './CertificateVerify';

export const metadata: Metadata = {
  title: 'Verify a Certificate | YAFT Designs',
  description: 'Verify the authenticity of a YAFT Designs training certificate using its certificate ID.',
};

export default function CertificatesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">CERTIFICATE VERIFICATION</div>
            <h1>Verify a YAFT Designs certificate</h1>
            <p className="lede">Enter the certificate ID printed on the document to confirm it was genuinely issued by YAFT Designs, and download a fresh copy.</p>
          </div>
        </section>
        <CertificateVerify />
      </main>
      <SiteFooter />
    </>
  );
}
