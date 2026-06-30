import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdminEmail, getAdminEmails } from './admin';

// isAdminEmail() is the single source of truth for "is this person
// allowed to do admin things" — used by both the proxy (page + API
// route protection) and isRequestFromAdmin() (the route-level guard
// for /api/invoices, which lives outside the proxy's matcher). A bug
// here would silently affect every admin auth check in the app.

describe('isAdminEmail', () => {
  const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'yaftdesigns@gmail.com, owner@example.com';
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS;
  });

  it('returns true for an exact match', () => {
    expect(isAdminEmail('yaftdesigns@gmail.com')).toBe(true);
  });

  it('returns true for a match regardless of case', () => {
    expect(isAdminEmail('YAFTDesigns@Gmail.com')).toBe(true);
    expect(isAdminEmail('OWNER@EXAMPLE.COM')).toBe(true);
  });

  it('returns false for a non-admin email', () => {
    expect(isAdminEmail('random-person@gmail.com')).toBe(false);
  });

  it('returns false for null or undefined — no session, no access', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isAdminEmail('')).toBe(false);
  });

  it('correctly parses a comma-separated ADMIN_EMAILS list with extra whitespace', () => {
    expect(getAdminEmails()).toEqual(['yaftdesigns@gmail.com', 'owner@example.com']);
  });

  it('returns an empty list (and denies everyone) when ADMIN_EMAILS is unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmails()).toEqual([]);
    expect(isAdminEmail('yaftdesigns@gmail.com')).toBe(false);
  });

  it('does not accidentally match a substring of an admin email', () => {
    expect(isAdminEmail('yaftdesigns@gmail.com.evil.com')).toBe(false);
    expect(isAdminEmail('notyaftdesigns@gmail.com')).toBe(false);
  });
});
