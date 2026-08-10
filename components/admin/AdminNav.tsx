'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from '../../app/admin/(dashboard)/admin.module.css';

type Counts = {
  pendingTestimonials: number;
  pendingApprovals: number;
  failedEmails: number;
  newLeads: number;
  pendingJobs: number;
};

type NavLink = { href: string; label: string; badge?: number };
type NavGroup = { label: string; links: NavLink[] };

export default function AdminNav({ counts }: { counts: Counts }) {
  const groups: NavGroup[] = [
    {
      label: 'Pipeline',
      links: [
        { href: '/admin/leads', label: 'Leads', badge: counts.newLeads },
        { href: '/admin/enquiries', label: 'Enquiries' },
        { href: '/admin/jobs', label: 'Jobs', badge: counts.pendingJobs },
        { href: '/admin/clients', label: 'Clients' },
        { href: '/admin/invoices', label: 'Invoices' },
      ],
    },
    {
      label: 'Content',
      links: [
        { href: '/admin/testimonials', label: 'Testimonials', badge: counts.pendingTestimonials },
        { href: '/admin/community', label: 'Community', badge: counts.pendingApprovals },
        { href: '/admin/projects', label: 'Projects' },
        { href: '/admin/certificates', label: 'Certificates' },
      ],
    },
    {
      label: 'Comms',
      links: [
        { href: '/admin/inbox', label: 'Inbox' },
        { href: '/admin/emails', label: 'Emails', badge: counts.failedEmails },
      ],
    },
  ];

  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

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
        return (
          <span key={group.label} className={styles.navItem} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? null : group.label)}
              className={styles.navDropdownTrigger}
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

      <Link href="/admin/analytics">Analytics</Link>
    </nav>
  );
}
