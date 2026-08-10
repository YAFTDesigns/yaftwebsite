import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';
import AdminNav from '@/components/admin/AdminNav';
import AdminSubNav from '@/components/admin/AdminSubNav';
import { getNavCounts } from '@/lib/admin/getNavCounts';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const counts = await getNavCounts();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/admin" className={styles.logo}>
            YAFT <span>Admin</span>
          </Link>
          <AdminNav counts={counts} />
          <SignOutButton />
        </div>
        <AdminSubNav counts={counts} />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
