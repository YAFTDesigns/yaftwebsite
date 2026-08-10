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
        { href: '/admin/workshops', label: 'Workshops' },
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
}
