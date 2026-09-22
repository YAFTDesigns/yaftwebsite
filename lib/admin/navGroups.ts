export type NavLink = { href: string; label: string; badge?: number };
export type NavGroup = { label: string; links: NavLink[] };

export type NavCounts = {
  pendingTestimonials: number;
  pendingApprovals: number;
  failedEmails: number;
  newLeads: number;
  pendingJobs: number;
};

// Single source of truth for how admin pages are grouped, used by both
// the top dropdown row (AdminNav) and the persistent active-group sub-nav
// row (AdminSubNav) so they never drift into different groupings.
export function getNavGroups(counts: NavCounts): NavGroup[] {
  return [
    {
      label: 'Sales',
      links: [
        { href: '/admin/leads', label: 'Leads', badge: counts.newLeads },
        { href: '/admin/enquiries', label: 'Enquiries' },
        { href: '/admin/jobs', label: 'Jobs', badge: counts.pendingJobs },
        { href: '/admin/clients', label: 'Clients' },
      ],
    },
    {
      label: 'Accounting',
      links: [
        { href: '/admin/invoices', label: 'Invoices' },
        { href: '/admin/invoices/report', label: 'Financial Year Report' },
      ],
    },
    {
      label: 'Marketing',
      links: [
        { href: '/admin/testimonials', label: 'Testimonials', badge: counts.pendingTestimonials },
        { href: '/admin/community', label: 'Community', badge: counts.pendingApprovals },
        { href: '/admin/projects', label: 'Projects' },
        { href: '/admin/workshops', label: 'Workshops' },
        { href: '/admin/services', label: 'Services page images' },
      ],
    },
    {
      label: 'YAFT Labs',
      links: [
        { href: '/admin/labs', label: 'Scripts & Categories' },
      ],
    },
    {
      label: 'Admin',
      links: [
        { href: '/admin/inbox', label: 'Inbox' },
        { href: '/admin/emails', label: 'Emails', badge: counts.failedEmails },
        { href: '/admin/team', label: 'Team' },
        { href: '/admin/certificates', label: 'Certificates' },
        { href: '/admin/analytics', label: 'Analytics' },
      ],
    },
  ];
}

/**
 * Which single link is "current" for a given pathname -- always the
 * most specific (longest) matching href, never more than one. Needed
 * because Accounting introduced the first case of one link's href
 * being a strict prefix of another's within the same group
 * (/admin/invoices and /admin/invoices/report): naive per-link
 * startsWith matching marked both as active simultaneously on the
 * report page, which is wrong, only the actual current page should
 * highlight. Centralized here (used by both AdminNav and AdminSubNav)
 * rather than duplicated inline in each component, so they can't
 * drift into different answers for the same pathname.
 */
export function findActiveLink(
  groups: NavGroup[],
  pathname: string
): { group: NavGroup; link: NavLink } | null {
  let best: { group: NavGroup; link: NavLink } | null = null;
  for (const group of groups) {
    for (const link of group.links) {
      const matches = pathname === link.href || pathname.startsWith(link.href + '/');
      if (!matches) continue;
      if (!best || link.href.length > best.link.href.length) {
        best = { group, link };
      }
    }
  }
  return best;
}
