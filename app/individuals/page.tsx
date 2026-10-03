import FunnelPage, { funnelMetadata } from '@/components/FunnelPage';

export const metadata = funnelMetadata('individual');

export default function Page() {
  return <FunnelPage funnelKey="individual" />;
}
