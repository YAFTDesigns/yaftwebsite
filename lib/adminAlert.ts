import { sendEmail, isEmailConfigured } from './email';

import { CONTACT_EMAIL } from '@/lib/contact';
const YAFT_EMAIL = CONTACT_EMAIL;

/**
 * Sends a low-noise operational alert to the admin inbox (CONTACT_EMAIL).
 * Used for things that fail silently otherwise -- e.g. a queued
 * enquiry/invoice that still fails to save on retry, which usually
 * means a real schema or config problem, not a transient blip.
 *
 * Failures here are swallowed and logged. An alert email failing to
 * send must never break the calling operation (e.g. the retry-queue
 * cron itself).
 */
export async function sendAdminAlert(subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await sendEmail({ to: YAFT_EMAIL, subject, html });
  } catch (err) {
    console.error('[adminAlert] failed to send:', err);
  }
}
