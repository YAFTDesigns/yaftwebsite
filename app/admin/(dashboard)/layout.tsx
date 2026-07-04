import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';
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
          <nav className={styles.nav}>
            <Link href="/admin">Overview</Link>
            <Link href="/admin/leads">Leads</Link>
            <Link href="/admin/enquiries">Enquiries</Link>
            <Link href="/admin/invoices">Invoices</Link>
            <Link href="/admin/inbox" className={styles.navLink}>Inbox</Link>
            <span className={styles.navItem}>
              <Link href="/admin/emails">Emails</Link>
              {counts.failedEmails > 0 && (
                <span className={styles.badge}>{counts.failedEmails > 9 ? '9+' : counts.failedEmails}</span>
              )}
            </span>
            <span className={styles.navItem}>
              <Link href="/admin/testimonials">Testimonials</Link>
              {counts.pendingTestimonials > 0 && (
                <span className={styles.badge}>{counts.pendingTestimonials > 9 ? '9+' : counts.pendingTestimonials}</span>
              )}
            </span>
            <span className={styles.navItem}>
              <Link href="/admin/community">Community</Link>
              {counts.pendingApprovals > 0 && (
                <span className={styles.badge}>{counts.pendingApprovals > 9 ? '9+' : counts.pendingApprovals}</span>
              )}
            </span>
            <Link href="/admin/projects">Projects</Link>
            <Link href="/admin/analytics">Analytics</Link>
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
