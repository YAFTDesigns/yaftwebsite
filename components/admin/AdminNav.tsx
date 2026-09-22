'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../../app/admin/(dashboard)/admin.module.css';
import { getNavGroups, findActiveLink, type NavCounts } from '@/lib/admin/navGroups';

export default function AdminNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  const groups = getNavGroups(counts);
  const activeGroup = findActiveLink(groups, pathname)?.group ?? null;

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Same hover pattern as the public SiteHeader: opens immediately on
  // mouse-enter, closes after a short delay on mouse-leave so moving
  // the cursor from the trigger down into the menu doesn't snap it
  // shut mid-transition. Click-to-toggle on the button itself (below)
  // still works exactly as before, unchanged -- that's what makes this
  // work on touch too, where hover never fires at all.
  function openOnHover(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenGroup(label);
  }
  function closeOnHoverOut() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenGroup(null), 200);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenGroup(null);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  return (
    <nav className={styles.nav} ref={navRef}>
      <Link href="/admin">Overview</Link>

      {groups.map((group) => {
        const groupBadgeTotal = group.links.reduce((s, l) => s + (l.badge ?? 0), 0);
        const isOpen = openGroup === group.label;
        const isActive = activeGroup?.label === group.label;
        return (
          <span
            key={group.label}
            className={styles.navItem}
            style={{ position: 'relative' }}
            onMouseEnter={() => openOnHover(group.label)}
            onMouseLeave={closeOnHoverOut}
          >
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? null : group.label)}
              className={styles.navDropdownTrigger}
              style={isActive ? { color: 'var(--brass)', borderColor: 'var(--brass)' } : undefined}
              aria-expanded={isOpen}
            >
              {group.label} <span style={{ fontSize: 9, marginLeft: 2 }}>{isOpen ? '\u25b2' : '\u25bc'}</span>
            </button>
            {groupBadgeTotal > 0 && (
              <span className={styles.badge}>{groupBadgeTotal > 99 ? '99+' : groupBadgeTotal}</span>
            )}
            {isOpen && (
              <div className={styles.navDropdownMenu}>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className={styles.navDropdownLink} onClick={() => setOpenGroup(null)}>
                    <span>{link.label}</span>
                    {!!link.badge && link.badge > 0 && (
                      <span className={styles.navDropdownBadge}>{link.badge > 99 ? '99+' : link.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </span>
        );
      })}
    </nav>
  );
}
