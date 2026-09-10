import { Resend } from 'resend';

const FROM_ADDRESS = 'YAFT Designs <notifications@yaftdesigns.com>';
const REPLY_TO = 'yaftdesigns@gmail.com';

let client: Resend | null = null;
export function getResendClient(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Who gets a copy of client-facing emails (invoices, etc.) so Yokes has a
// record in his own inbox of what actually went out. Deliberately separate
// from ADMIN_EMAILS (the login allowlist) -- that list includes personal
// addresses used just for admin access, not necessarily where business
// confirmations should land. Defaults to the business Gmail.
export function getNotificationBcc(): string[] {
  const raw = process.env.INVOICE_NOTIFICATION_EMAIL ?? REPLY_TO;
  return raw.split(',').map((e) => e.trim()).filter(Boolean);
}

export type EmailAttachment = { filename: string; content: string }; // content is base64

/**
 * Sends an email via Resend. Throws on failure -- callers are expected to
 * catch this themselves and log to email_logs, same pattern as before.
 * Returns Resend's own email id so callers can store it alongside their
 * email_logs row -- lets the bounce webhook match an event back to the
 * exact send, rather than guessing by to_email + nearest timestamp.
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  bcc,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  bcc?: string | string[];
}): Promise<{ id: string | null }> {
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    attachments,
    replyTo: REPLY_TO,
    ...(bcc ? { bcc } : {}),
  });
  if (error) throw new Error(error.message);
  return { id: data?.id ?? null };
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}
