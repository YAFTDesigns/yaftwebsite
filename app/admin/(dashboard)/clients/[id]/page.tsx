import ClientJobsClient from './ClientJobsClient';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientJobsClient clientId={id} />;
}
