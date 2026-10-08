import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isRequestFromAdmin } from '@/lib/admin/requireAdmin';
import SignOutButton from '@/components/SignOutButton';
import AdminNav from '@/components/admin/AdminNav';
import AdminSubNav from '@/components/admin/AdminSubNav';
import { getNavCounts } from '@/lib/admin/getNavCounts';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defence in depth: the proxy normally gates /admin, but fail closed here too
  // (covers missing Supabase config or a proxy mismatch).
  if (!(await isRequestFromAdmin())) redirect('/admin/login');
  const counts = await getNavCounts();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/admin" className={styles.logo}>
            YAFT <span>Admin</span>
          </Link>
          <AdminNav counts={counts} />
          <a href="https://www.yaftdesigns.com" target="_blank" rel="noopener noreferrer" className="btn-ghost">
            View website ↗
          </a>
          <SignOutButton />
        </div>
        <AdminSubNav counts={counts} />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
