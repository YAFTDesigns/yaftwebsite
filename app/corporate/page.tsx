import FunnelPage, { funnelMetadata } from '@/components/FunnelPage';

export const metadata = funnelMetadata('corporate');

export default function Page() {
  return <FunnelPage funnelKey="corporate" />;
}
