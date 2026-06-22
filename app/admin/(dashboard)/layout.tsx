import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/admin" className={styles.logo}>
            YAFT <span>Admin</span>
          </Link>
          <nav className={styles.nav}>
            <Link href="/admin">Overview</Link>
            <Link href="/admin/leads">Leads</Link>
            <Link href="/admin/enquiries">Enquiries</Link>
            <Link href="/admin/analytics">Analytics</Link>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
