'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../../app/admin/(dashboard)/admin.module.css';
import { getNavGroups, type NavCounts } from '@/lib/admin/navGroups';

// Always-visible row of the current section's sibling pages -- e.g. on
// /admin/clients (part of Pipeline), shows Leads/Enquiries/Jobs/Clients/
// Invoices right there, so switching between them never needs opening the
// AdminNav dropdown. Renders nothing on pages that aren't part of any
// group (Overview, Analytics), where there's nothing to show anyway.
export default function AdminSubNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const groups = getNavGroups(counts);
  const activeGroup = groups.find((g) => g.links.some((l) => pathname === l.href || pathname.startsWith(l.href + '/')));

  if (!activeGroup) return null;

  return (
    <div className={styles.subNav}>
      {activeGroup.links.map((link) => {
        const isCurrent = pathname === link.href || pathname.startsWith(link.href + '/');
        return (
          <Link
            key={link.href}
            href={link.href}
            className={styles.subNavLink}
            style={isCurrent ? { color: 'var(--brass)', borderColor: 'var(--brass)' } : undefined}
          >
            {link.label}
            {!!link.badge && link.badge > 0 && (
              <span className={styles.navDropdownBadge} style={{ marginLeft: 6 }}>{link.badge > 99 ? '99+' : link.badge}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
