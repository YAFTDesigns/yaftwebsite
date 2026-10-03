import FunnelPage, { funnelMetadata } from '@/components/FunnelPage';

export const metadata = funnelMetadata('consulting');

export default function Page() {
  return <FunnelPage funnelKey="consulting" />;
}
