'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../../app/admin/(dashboard)/admin.module.css';
import { getNavGroups, findActiveLink, type NavCounts } from '@/lib/admin/navGroups';

// Always-visible row of the current section's sibling pages -- e.g. on
// /admin/clients (part of Sales), shows Leads/Enquiries/Jobs/Clients
// right there, so switching between them never needs opening the
// AdminNav dropdown. Renders nothing on pages that aren't part of any
// group (Overview, Analytics), where there's nothing to show anyway.
export default function AdminSubNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const groups = getNavGroups(counts);
  const active = findActiveLink(groups, pathname);
  const activeGroup = active?.group ?? null;

  if (!activeGroup) return null;

  return (
    <div className={styles.subNav}>
      {activeGroup.links.map((link) => {
        const isCurrent = link.href === active?.link.href;
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
