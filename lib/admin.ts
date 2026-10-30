export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

/**
 * Admin access needs BOTH an allow-listed address AND a verified one. Once public student sign-up exists in the same
 * auth project, anyone can create an account with any address; an unverified address must never be treated as an admin.
 */
export function isAdminUser(user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined): boolean {
  return !!user && isAdminEmail(user.email) && !!user.email_confirmed_at;
}
