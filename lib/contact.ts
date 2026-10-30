// Single place for the public contact / owner-alert email. To change it everywhere (site, emails,
// invoices, alerts) set NEXT_PUBLIC_CONTACT_EMAIL in Vercel and redeploy. No code change needed.
// (This is separate from ADMIN_EMAILS, which controls who can log in to the admin.)
export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || '').trim() || 'yaftdesigns@gmail.com';
