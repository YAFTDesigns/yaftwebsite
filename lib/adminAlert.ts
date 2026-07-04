import { google } from 'googleapis';

const YAFT_EMAIL = 'yaftdesigns@gmail.com';

async function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

function makeEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const lines = [
    `From: YAFT Site Alerts <${YAFT_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
  ];
  return Buffer.from(lines.join('\n')).toString('base64url');
}

/**
 * Sends a low-noise operational alert to the admin inbox (yaftdesigns@gmail.com).
 * Used for things that fail silently otherwise -- e.g. a queued
 * enquiry/invoice that still fails to save on retry, which usually
 * means a real schema or config problem, not a transient blip.
 *
 * Failures here are swallowed and logged. An alert email failing to
 * send must never break the calling operation (e.g. the retry-queue
 * cron itself).
 */
export async function sendAdminAlert(subject: string, html: string): Promise<void> {
  try {
    const gmail = await getGmailClient();
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: makeEmail({ to: YAFT_EMAIL, subject, html }) },
    });
  } catch (err) {
    console.error('[adminAlert] failed to send:', err);
  }
}
