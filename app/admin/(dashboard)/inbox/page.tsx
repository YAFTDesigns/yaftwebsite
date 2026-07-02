import { requireAdmin } from '@/lib/admin/requireAdmin';
import InboxClient from './InboxClient';

export const metadata = { title: 'Inbox | YAFT Admin' };

export default async function InboxPage() {
  await requireAdmin();
  return <InboxClient />;
}
