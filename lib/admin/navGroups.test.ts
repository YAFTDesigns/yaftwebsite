import { describe, it, expect } from 'vitest';
import { findActiveLink, type NavGroup } from './navGroups';

const groups: NavGroup[] = [
  {
    label: 'Sales',
    links: [
      { href: '/admin/leads', label: 'Leads' },
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
];

describe('findActiveLink', () => {
  it('matches an exact href', () => {
    const result = findActiveLink(groups, '/admin/leads');
    expect(result?.link.label).toBe('Leads');
    expect(result?.group.label).toBe('Sales');
  });

  it('matches a genuine sub-page via prefix (e.g. a detail page)', () => {
    const result = findActiveLink(groups, '/admin/clients/abc-123');
    expect(result?.link.label).toBe('Clients');
  });

  // The actual regression this exists to guard: /admin/invoices/report
  // matches BOTH /admin/invoices (as a prefix) and /admin/invoices/report
  // (exactly) -- naive per-link matching marks both as current
  // simultaneously, which is what happened before this fix. Only the
  // longer, more specific one should win.
  it('picks the more specific link when one href is a prefix of another in the same group', () => {
    const result = findActiveLink(groups, '/admin/invoices/report');
    expect(result?.link.label).toBe('Financial Year Report');
    expect(result?.link.href).toBe('/admin/invoices/report');
  });

  it('still matches the shorter link correctly when actually on that page', () => {
    const result = findActiveLink(groups, '/admin/invoices');
    expect(result?.link.label).toBe('Invoices');
  });

  it('returns null for a pathname that matches nothing', () => {
    expect(findActiveLink(groups, '/admin/analytics')).toBeNull();
  });
});
