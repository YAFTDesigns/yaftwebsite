import { describe, it, expect } from 'vitest';
import { isCommunityTable } from './communityTables';

// /api/admin/community uses the service-role key, which bypasses RLS
// entirely. This allowlist is the ONLY thing stopping that route from
// being usable to read/write/delete arbitrary tables like `invoices`
// or `leads` — these tests exist to make sure that boundary holds.

describe('isCommunityTable', () => {
  it('allows the three intended tables', () => {
    expect(isCommunityTable('student_work')).toBe(true);
    expect(isCommunityTable('publications')).toBe(true);
    expect(isCommunityTable('partners')).toBe(true);
  });

  it('rejects tables outside the allowlist, even sensitive ones', () => {
    expect(isCommunityTable('invoices')).toBe(false);
    expect(isCommunityTable('leads')).toBe(false);
    expect(isCommunityTable('email_logs')).toBe(false);
    expect(isCommunityTable('testimonials')).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    expect(isCommunityTable(undefined)).toBe(false);
    expect(isCommunityTable(null)).toBe(false);
    expect(isCommunityTable(123)).toBe(false);
    expect(isCommunityTable({})).toBe(false);
    expect(isCommunityTable([])).toBe(false);
  });

  it('rejects SQL-injection-shaped strings — they are simply not in the allowlist', () => {
    expect(isCommunityTable('student_work; DROP TABLE invoices;')).toBe(false);
    expect(isCommunityTable("student_work' OR '1'='1")).toBe(false);
  });

  it('is case-sensitive — does not accidentally allow variants', () => {
    expect(isCommunityTable('Student_Work')).toBe(false);
    expect(isCommunityTable('STUDENT_WORK')).toBe(false);
  });
});
