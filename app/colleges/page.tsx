import FunnelPage, { funnelMetadata } from '@/components/FunnelPage';

export const metadata = funnelMetadata('college');

export default function Page() {
  return <FunnelPage funnelKey="college" />;
}
