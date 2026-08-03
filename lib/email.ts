import { Resend } from 'resend';

const FROM_ADDRESS = 'YAFT Designs <notifications@yaftdesigns.com>';
const REPLY_TO = 'yaftdesigns@gmail.com';

let client: Resend | null = null;
function getResendClient(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export type EmailAttachment = { filename: string; content: string }; // content is base64

/**
 * Sends an email via Resend. Throws on failure -- callers are expected to
 * catch this themselves and log to email_logs, same pattern as before.
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    attachments,
    replyTo: REPLY_TO,
  });
  if (error) throw new Error(error.message);
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}
